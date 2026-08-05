import React from 'react';
import { AuditLog } from '../types';
import { History, Shield, User } from 'lucide-react';

interface AuditLogsPageProps {
  logs: AuditLog[];
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Histórico & Logs de Atividade</h1>
          <p className="text-xs text-slate-500">
            Registro de auditoria de criações, alterações, acessos e gerações de catálogos
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Data / Hora</th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Ação</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Endereço IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    {log.user_name}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[#F10F4D] text-[10px] font-extrabold uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 max-w-md">
                    {log.description}
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
