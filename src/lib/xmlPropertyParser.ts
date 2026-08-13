import { Property } from '../types';
import { parseNumericPrice } from './priceUtils';

export interface ParsedXMLProperty {
  id?: string;
  code: string;
  title: string;
  description: string;
  category: string;
  purpose: 'Venda' | 'Locação' | 'Venda e Locação';
  status: string;
  price: number;
  rent_price?: number;
  condo_fee: number;
  iptu: number;
  neighborhood: string;
  city: string;
  state: string;
  address: string;
  total_area: number;
  built_area: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking_spaces: number;
  features: string[];
  images: string[];
  main_image: string;
  user_id?: string;
  external_id?: string;
  broker_name?: string;
  broker_email?: string;
}

export interface XMLImportComparison {
  all: ParsedXMLProperty[];
  newProperties: ParsedXMLProperty[];
  existingProperties: {
    xmlProperty: ParsedXMLProperty;
    existingProperty: Property;
  }[];
  totalCount: number;
  newCount: number;
  existingCount: number;
}

/**
 * Normalizes property category to standard Lopes Manaus categories
 */
export function normalizeCategory(rawCategory: string): string {
  if (!rawCategory) return 'Apartamento';
  const c = rawCategory.toLowerCase().trim();

  if (c.includes('condom') || (c.includes('casa') && c.includes('fechad'))) return 'Casa em Condomínio';
  if (c.includes('cobertura') || c.includes('penthouse')) return 'Cobertura';
  if (c.includes('casa') || c.includes('sobrado') || c.includes('terrea')) return 'Casa';
  if (c.includes('terreno') || c.includes('lote') || c.includes('gleba')) return 'Terreno / Lote';
  if (c.includes('sala') || c.includes('escritorio') || c.includes('consultorio')) return 'Sala Comercial';
  if (c.includes('predio') || c.includes('edificio') || c.includes('comercial')) return 'Prédio Comercial';
  if (c.includes('galp') || c.includes('armaz') || c.includes('deposito') || c.includes('barrac')) return 'Galpão / Pavilhão';
  if (c.includes('flat') || c.includes('studio') || c.includes('loft') || c.includes('kitnet') || c.includes('conjugado')) return 'Flat / Studio';
  if (c.includes('chac') || c.includes('sitio') || c.includes('fazenda') || c.includes('rural')) return 'Chácara / Sítio';
  if (c.includes('ponto') || c.includes('loja') || c.includes('box')) return 'Ponto Comercial';
  if (c.includes('apart') || c.includes('apto') || c.includes('duplex') || c.includes('triplex')) return 'Apartamento';

  return 'Apartamento';
}

/**
 * Normalizes transaction purpose (Venda, Locação, Venda e Locação)
 */
export function normalizePurpose(
  rawPurpose: string,
  price: number,
  rentPrice: number
): 'Venda' | 'Locação' | 'Venda e Locação' {
  const p = (rawPurpose || '').toLowerCase();
  
  if (p.includes('ambos') || p.includes('venda e loc') || (price > 0 && rentPrice > 0)) {
    return 'Venda e Locação';
  }
  if (p.includes('loca') || p.includes('alug') || p.includes('rent') || (rentPrice > 0 && price === 0)) {
    return 'Locação';
  }
  return 'Venda';
}

/**
 * Helper to safely extract direct text from an XML element tag name (case-insensitive search)
 */
function getTagText(parent: Element, tagNames: string[]): string {
  for (const name of tagNames) {
    // 1. Direct children
    const children = Array.from(parent.children);
    for (const child of children) {
      if (child.tagName.toLowerCase() === name.toLowerCase()) {
        const txt = child.textContent?.trim() || '';
        if (txt) return txt;
      }
    }
    // 2. QuerySelector fallback
    try {
      const el = parent.querySelector(name);
      if (el && el.textContent?.trim()) {
        return el.textContent.trim();
      }
    } catch {
      // ignore querySelector syntax errors on custom tags
    }
  }
  return '';
}

/**
 * Helper to collect all image URLs from an XML node
 */
function extractImages(node: Element): string[] {
  const images: string[] = [];
  const validUrlRegex = /^(https?:\/\/|\/\/)/i;

  // Search all possible image tags inside this listing
  const possibleTags = ['Foto', 'foto', 'URLArquivo', 'urlarquivo', 'URL', 'url', 'Image', 'image', 'Item', 'item', 'Media', 'media', 'Picture', 'picture', 'Arquivo', 'arquivo'];

  for (const tag of possibleTags) {
    const elements = node.getElementsByTagName(tag);
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const txt = (el.textContent || '').trim();
      if (txt && validUrlRegex.test(txt) && !images.includes(txt)) {
        // Filter out non-image files if needed
        if (txt.match(/\.(jpg|jpeg|png|webp|avif|heic)(\?.*)?$/i) || !txt.match(/\.(pdf|doc|xml|mp4)$/i)) {
          images.push(txt);
        }
      }
      // Check attributes e.g. <Item url="https://...">
      const attrUrl = el.getAttribute('url') || el.getAttribute('src') || el.getAttribute('href');
      if (attrUrl && validUrlRegex.test(attrUrl) && !images.includes(attrUrl)) {
        images.push(attrUrl);
      }
    }
  }

  // Fallback default image if none found
  if (images.length === 0) {
    images.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80');
  }

  return images;
}

/**
 * Helper to collect amenities/features from an XML node
 */
function extractFeatures(node: Element): string[] {
  const features: string[] = [];
  const featureContainers = ['Features', 'features', 'Caracteristicas', 'caracteristicas', 'Infraestrutura', 'infraestrutura', 'Detalhes', 'detalhes'];
  
  for (const c of featureContainers) {
    const container = node.getElementsByTagName(c)[0];
    if (container) {
      const items = container.children;
      for (let i = 0; i < items.length; i++) {
        const txt = items[i].textContent?.trim();
        if (txt && !features.includes(txt)) {
          features.push(txt);
        }
      }
    }
  }

  // Also check direct boolean flags or tags like <Piscina>1</Piscina> or <Churrasqueira>Sim</Churrasqueira>
  const commonFeatureTags = [
    'Piscina', 'Churrasqueira', 'Varanda', 'VarandaGourmet', 'Elevador', 'Academia',
    'Playground', 'SalnodeFestas', 'Portaria24h', 'ArCondicionado', 'ArmariosEmbutidos',
    'VistaPanoramica', 'Gerador100', 'Seguranca24h', 'QuadraPoliesportiva', 'Sauna',
    'Mobiliado', 'Lavanderia'
  ];

  for (const tag of commonFeatureTags) {
    const el = node.getElementsByTagName(tag)[0];
    if (el) {
      const val = el.textContent?.trim().toLowerCase();
      if (val === '1' || val === 'sim' || val === 'true' || val === 's') {
        const readable = tag.replace(/([A-Z])/g, ' $1').trim();
        if (!features.includes(readable)) {
          features.push(readable);
        }
      }
    }
  }

  return features;
}

/**
 * Main function to parse a raw XML string into a structured array of ParsedXMLProperty
 */
export function parsePropertyXML(xmlString: string): { properties: ParsedXMLProperty[]; errors: string[] } {
  const properties: ParsedXMLProperty[] = [];
  const errors: string[] = [];

  if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
    return { properties: [], errors: ['O conteúdo XML enviado está vazio.'] };
  }

  // Clean XML string if it has BOM or leading whitespace
  let cleanXml = xmlString.trim().replace(/^\uFEFF/, '');

  let xmlDoc: Document;
  try {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(cleanXml, 'application/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      // Try parsing as text/html fallback if application/xml was too strict
      const fallbackParser = new DOMParser();
      xmlDoc = fallbackParser.parseFromString(cleanXml, 'text/html');
    }
  } catch (err: any) {
    return { properties: [], errors: [`Erro ao processar o formato do arquivo XML: ${err.message || err}`] };
  }

  // Find all property listing nodes
  // Standard feeds use: <Listing>, <Imovel>, <imovel>, <Property>, <property>, <item>
  const propertyNodeNames = ['Listing', 'listing', 'Imovel', 'imovel', 'Property', 'property', 'Item', 'item'];
  let propertyElements: Element[] = [];

  for (const name of propertyNodeNames) {
    const found = Array.from(xmlDoc.getElementsByTagName(name));
    if (found.length > 0) {
      propertyElements = found;
      break;
    }
  }

  // If no standard elements found, try finding any repeated children under root
  if (propertyElements.length === 0) {
    const root = xmlDoc.documentElement || xmlDoc.body;
    if (root && root.children.length > 0) {
      // Check if root has <Imoveis> or <Listings> container
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i];
        if (['imoveis', 'listings', 'properties', 'carga'].includes(child.tagName.toLowerCase())) {
          propertyElements = Array.from(child.children);
          break;
        }
      }
      if (propertyElements.length === 0) {
        propertyElements = Array.from(root.children);
      }
    }
  }

  if (propertyElements.length === 0) {
    return { properties: [], errors: ['Nenhum imóvel foi encontrado no XML fornecido. Verifique se o arquivo segue o padrão de portais (VivaReal, ZAP, Imovelweb, Kenlo ou XML padrão de imóveis).'] };
  }

  let autoCodeCounter = 1001;

  propertyElements.forEach((node, index) => {
    try {
      // Extract Code / ID
      const rawCode = getTagText(node, [
        'ListingID', 'listingid', 'CodigoImovel', 'codigoimovel', 'Codigo', 'codigo',
        'Referencia', 'referencia', 'ID', 'id', 'PropertyID', 'propertyid', 'CodImovel', 'codimovel'
      ]);

      const code = rawCode ? rawCode.trim() : `IMP-${autoCodeCounter++}`;

      // Extract Title
      const rawTitle = getTagText(node, [
        'Title', 'title', 'Titulo', 'titulo', 'TituloSite', 'titulosite', 'NomeImovel', 'nomeimovel',
        'Header', 'header', 'PropertyTitle', 'propertytitle'
      ]);

      // Extract Description
      const rawDesc = getTagText(node, [
        'Description', 'description', 'Descricao', 'descricao', 'Observacoes', 'observacoes',
        'DescricaoWeb', 'descricaoweb', 'TextoAnuncio', 'textoanuncio', 'Details', 'details'
      ]);

      // Extract Category / Type
      const rawCategory = getTagText(node, [
        'PropertyType', 'propertytype', 'TipoImovel', 'tipoimovel', 'Tipo', 'tipo',
        'SubtipoImovel', 'subtipoimovel', 'Categoria', 'categoria', 'Type', 'type'
      ]);
      const category = normalizeCategory(rawCategory);

      // Extract Purpose / Transaction Type
      const rawPurpose = getTagText(node, [
        'TransactionType', 'transactiontype', 'Finalidade', 'finalidade', 'TipoNegociacao', 'tiponegociacao',
        'Pretencao', 'pretencao', 'Purpose', 'purpose'
      ]);

      // Extract Prices
      const rawPrice = getTagText(node, [
        'ListPrice', 'listprice', 'Price', 'price', 'PrecoVenda', 'precovenda', 'ValorVenda', 'valorvenda',
        'Valor', 'valor', 'Preco', 'preco'
      ]);

      const rawRentPrice = getTagText(node, [
        'RentalPrice', 'rentalprice', 'PrecoLocacao', 'precolocacao', 'ValorLocacao', 'valorlocacao',
        'PrecoAluguel', 'precoaluguel', 'ValorAluguel', 'valoraluguel', 'RentPrice', 'rentprice'
      ]);

      const rawCondoFee = getTagText(node, [
        'CondominiumFee', 'condominiumfee', 'ValorCondominio', 'valorcondominio', 'CondoFee', 'condofee',
        'Condominio', 'condominio', 'TaxaCondominio', 'taxacondominio'
      ]);

      const rawIptu = getTagText(node, [
        'IPTU', 'iptu', 'PropertyTax', 'propertytax', 'ValorIPTU', 'valoriptu', 'TaxaIPTU', 'taxaiptu'
      ]);

      let price = parseNumericPrice(rawPrice);
      let rentPrice = parseNumericPrice(rawRentPrice);
      const condoFee = parseNumericPrice(rawCondoFee);
      const iptu = parseNumericPrice(rawIptu);

      const purpose = normalizePurpose(rawPurpose, price, rentPrice);

      // Adjust price/rentPrice matching purpose
      if (purpose === 'Locação') {
        if (rentPrice === 0 && price > 0) {
          rentPrice = price;
          price = 0;
        }
      } else if (purpose === 'Venda') {
        if (price === 0 && rentPrice > 0) {
          price = rentPrice;
          rentPrice = 0;
        }
      }

      // Location / Address
      const neighborhood = getTagText(node, [
        'Neighborhood', 'neighborhood', 'Bairro', 'bairro', 'BairroImovel', 'bairroimovel', 'District', 'district'
      ]) || 'Adrianópolis';

      const city = getTagText(node, [
        'City', 'city', 'Cidade', 'cidade', 'Municipio', 'municipio'
      ]) || 'Manaus';

      const state = getTagText(node, [
        'State', 'state', 'UF', 'uf', 'Estado', 'estado'
      ]) || 'AM';

      const address = getTagText(node, [
        'Address', 'address', 'Endereco', 'endereco', 'Logradouro', 'logradouro', 'Rua', 'rua'
      ]);

      // Areas
      const rawTotalArea = getTagText(node, [
        'LotArea', 'lotarea', 'AreaTotal', 'areatotal', 'TotalArea', 'totalarea', 'AreaTerreno', 'areaterreno'
      ]);
      const rawBuiltArea = getTagText(node, [
        'LivingArea', 'livingarea', 'AreaUtil', 'areautil', 'AreaPrivativa', 'areaprivativa', 'BuiltArea', 'builtarea', 'AreaConstruida', 'areaconstruida'
      ]);

      const totalArea = parseNumericPrice(rawTotalArea);
      const builtArea = parseNumericPrice(rawBuiltArea) || totalArea;

      // Quantitative Specs
      const bedrooms = Math.round(parseNumericPrice(getTagText(node, ['Bedrooms', 'bedrooms', 'Quartos', 'quartos', 'Dormitorios', 'dormitorios', 'Dorms', 'dorms'])));
      const suites = Math.round(parseNumericPrice(getTagText(node, ['Suites', 'suites', 'Suíte', 'suite', 'QtdeSuites', 'qtdesuites'])));
      const bathrooms = Math.round(parseNumericPrice(getTagText(node, ['Bathrooms', 'bathrooms', 'Banheiros', 'banheiros', 'Banhos', 'banhos', 'WCs', 'wcs'])));
      const parkingSpaces = Math.round(parseNumericPrice(getTagText(node, ['Garage', 'garage', 'Vagas', 'vagas', 'Garagens', 'garagens', 'Estacionamento', 'estacionamento'])));

      // Features & Images
      const features = extractFeatures(node);
      const images = extractImages(node);
      const mainImage = images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

      // Broker / Captador info if present
      const brokerName = getTagText(node, ['Corretor', 'corretor', 'Captador', 'captador', 'BrokerName', 'brokername', 'Agente', 'agente']);
      const brokerEmail = getTagText(node, ['EmailCorretor', 'emailcorretor', 'BrokerEmail', 'brokeremail']);

      // Computed Title fallback
      const finalTitle = rawTitle || `${category} em ${neighborhood}, ${city} - ${builtArea > 0 ? builtArea + 'm²' : ''} ${bedrooms > 0 ? bedrooms + ' Qts' : ''}`.trim();

      const item: ParsedXMLProperty = {
        code,
        title: finalTitle,
        description: rawDesc || `Excelente ${category.toLowerCase()} localizado no bairro ${neighborhood}, Manaus/AM. Conta com ${builtArea > 0 ? builtArea + 'm² de área,' : ''} ${bedrooms > 0 ? bedrooms + ' dormitórios' : ''} ${suites > 0 ? `(${suites} suítes)` : ''} e ${parkingSpaces > 0 ? parkingSpaces + ' vagas de garagem.' : '.'}`,
        category,
        purpose,
        status: 'Disponível',
        price: price || 0,
        rent_price: rentPrice > 0 ? rentPrice : undefined,
        condo_fee: condoFee || 0,
        iptu: iptu || 0,
        neighborhood,
        city,
        state,
        address,
        total_area: totalArea || builtArea || 0,
        built_area: builtArea || totalArea || 0,
        bedrooms: bedrooms || 0,
        suites: suites || 0,
        bathrooms: bathrooms || (suites > 0 ? suites : 1),
        parking_spaces: parkingSpaces || 0,
        features: features.length > 0 ? features : ['Excelente Localização', 'Segurança', 'Ótimo Acabamento'],
        images,
        main_image: mainImage,
        broker_name: brokerName || undefined,
        broker_email: brokerEmail || undefined
      };

      properties.push(item);
    } catch (err: any) {
      errors.push(`Erro ao processar item #${index + 1}: ${err.message || err}`);
    }
  });

  return { properties, errors };
}

/**
 * Compares parsed XML properties against current system properties to determine
 * which ones are brand new and which ones already exist (deduplication).
 */
export function compareXMLWithExisting(
  parsedProperties: ParsedXMLProperty[],
  existingProperties: Property[]
): XMLImportComparison {
  const existingCodeMap = new Map<string, Property>();

  existingProperties.forEach(p => {
    if (p.code) {
      existingCodeMap.set(p.code.toLowerCase().trim(), p);
    }
    if (p.id) {
      existingCodeMap.set(p.id.toLowerCase().trim(), p);
    }
  });

  const newProperties: ParsedXMLProperty[] = [];
  const existingMatches: { xmlProperty: ParsedXMLProperty; existingProperty: Property }[] = [];

  // Deduplicate within the XML itself as well
  const seenCodesInXML = new Set<string>();

  parsedProperties.forEach(xmlProp => {
    const cleanCode = (xmlProp.code || '').toLowerCase().trim();

    if (seenCodesInXML.has(cleanCode)) {
      // Already seen in this same XML batch
      return;
    }
    seenCodesInXML.add(cleanCode);

    const match = existingCodeMap.get(cleanCode);
    if (match) {
      existingMatches.push({
        xmlProperty: xmlProp,
        existingProperty: match
      });
    } else {
      newProperties.push(xmlProp);
    }
  });

  return {
    all: parsedProperties,
    newProperties,
    existingProperties: existingMatches,
    totalCount: parsedProperties.length,
    newCount: newProperties.length,
    existingCount: existingMatches.length
  };
}

/**
 * Sample XML template for easy testing
 */
export const SAMPLE_XML_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<Listings>
  <Listing>
    <ListingID>LOP-801</ListingID>
    <Title>Apartamento Adrianópolis Reserva Inglesa</Title>
    <TransactionType>Venda</TransactionType>
    <PropertyType>Apartamento</PropertyType>
    <ListPrice>1450000</ListPrice>
    <CondominiumFee>1200</CondominiumFee>
    <IPTU>2800</IPTU>
    <LivingArea>168</LivingArea>
    <Bedrooms>4</Bedrooms>
    <Suites>3</Suites>
    <Bathrooms>4</Bathrooms>
    <Garage>3</Garage>
    <Neighborhood>Adrianópolis</Neighborhood>
    <City>Manaus</City>
    <State>AM</State>
    <Address>Av. Mário Ypiranga, 1200</Address>
    <Description>Apartamento de alto padrão com varanda gourmet climatizada, vista livre permanente, fino acabamento e área de lazer estilo resort.</Description>
    <Features>
      <Feature>Varanda Gourmet</Feature>
      <Feature>Piscina Adulto e Infantil</Feature>
      <Feature>Academia Equipada</Feature>
      <Feature>Gerador 100%</Feature>
      <Feature>Portaria 24h</Feature>
    </Features>
    <Media>
      <Item>https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
      <Item>https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
    </Media>
  </Listing>
  <Listing>
    <ListingID>LOP-802</ListingID>
    <Title>Casa em Condomínio Ponta Negra Ephigênio</Title>
    <TransactionType>Venda</TransactionType>
    <PropertyType>Casa em Condomínio</PropertyType>
    <ListPrice>2800000</ListPrice>
    <CondominiumFee>1500</CondominiumFee>
    <IPTU>4200</IPTU>
    <LivingArea>380</LivingArea>
    <Bedrooms>4</Bedrooms>
    <Suites>4</Suites>
    <Bathrooms>6</Bathrooms>
    <Garage>4</Garage>
    <Neighborhood>Ponta Negra</Neighborhood>
    <City>Manaus</City>
    <State>AM</State>
    <Address>Alameda das Palmeiras, Condomínio Fechado</Address>
    <Description>Casa duplex contemporânea com energia solar, piscina privativa com hidromassagem, espaço gourmet integrado e 4 amplas suítes com closet.</Description>
    <Features>
      <Feature>Piscina Privativa</Feature>
      <Feature>Energia Solar</Feature>
      <Feature>Espaço Gourmet</Feature>
      <Feature>Segurança Armada 24h</Feature>
    </Features>
    <Media>
      <Item>https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
      <Item>https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
    </Media>
  </Listing>
  <Listing>
    <ListingID>LOP-803</ListingID>
    <Title>Flat Mobiliado Vieiralves Studio Prime</Title>
    <TransactionType>Locação</TransactionType>
    <PropertyType>Flat / Studio</PropertyType>
    <RentalPrice>3800</RentalPrice>
    <CondominiumFee>650</CondominiumFee>
    <IPTU>450</IPTU>
    <LivingArea>48</LivingArea>
    <Bedrooms>1</Bedrooms>
    <Suites>1</Suites>
    <Bathrooms>1</Bathrooms>
    <Garage>1</Garage>
    <Neighborhood>Nossa Senhora das Graças</Neighborhood>
    <City>Manaus</City>
    <State>AM</State>
    <Address>Rua Rio Madeira, Vieiralves</Address>
    <Description>Studio 100% mobiliado e decorado, pronto para morar no coração do Vieiralves. Prédio moderno com coworking, lavanderia e rooftop lounge.</Description>
    <Features>
      <Feature>100% Mobiliado</Feature>
      <Feature>Coworking</Feature>
      <Feature>Rooftop Lounge</Feature>
      <Feature>Ar Condicionado Inverter</Feature>
    </Features>
    <Media>
      <Item>https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&amp;fit=crop&amp;w=1200&amp;q=80</Item>
    </Media>
  </Listing>
</Listings>`;
