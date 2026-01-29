import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';
import {
    fetchPlannings,
    savePlanning,
    deactivatePlanning,
    fetchMetaAccounts,
    fetchCategories,
    PlanningInsert,
    CategoryRow
} from '../services/supabaseService';
import { MetaAdAccount } from '../types';

// Helper for currency
const formatCurrency = (val: number) => `R$ ${val?.toFixed(2) || '0.00'}`;

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
    />
);

export const PlanningTableView: React.FC = () => {
    const [plannings, setPlannings] = useState<any[]>([]); // Using any for joined data temporarily
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    const [categories, setCategories] = useState<CategoryRow[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const emptyForm: Partial<PlanningInsert> = {
        account_id: '',
        planned_revenue: 0,
        average_ticket: 0,
        cpl_average: 0,
        cpl_custom: false,
        observation: '',
        is_undefined: false,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        active: true
    };

    const [formData, setFormData] = useState<Partial<PlanningInsert>>(emptyForm);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [pData, aData, cData] = await Promise.all([
                fetchPlannings(),
                fetchMetaAccounts(),
                fetchCategories()
            ]);
            setPlannings(pData);
            setAccounts(aData);
            setCategories(cData);
        } catch (error) {
            console.error("Error loading planning data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Effect: Auto-fill CPL when Account changes (if not custom)
    useEffect(() => {
        if (!formData.account_id || formData.cpl_custom) return;

        const account = accounts.find(a => a.account_id === formData.account_id);
        if (account && account.categoria_id) {
            const category = categories.find(c => c.id === account.categoria_id);
            if (category) {
                setFormData(prev => ({ ...prev, cpl_average: category.cpl_medio || 0 }));
            }
        }
    }, [formData.account_id, formData.cpl_custom, accounts, categories]);


    const handleSave = async () => {
        if (!formData.account_id) {
            alert("Selecione uma conta de anúncio.");
            return;
        }

        if (formData.cpl_custom && !formData.observation) {
            alert("Observação é obrigatória quando usar CPL personalizado.");
            return;
        }

        setIsSaving(true);
        try {
            // Ensure numbers
            const payload = {
                ...formData,
                planned_revenue: Number(formData.planned_revenue),
                average_ticket: Number(formData.average_ticket),
                cpl_average: Number(formData.cpl_average),
                month: formData.is_undefined ? null : Number(formData.month),
                year: formData.is_undefined ? null : Number(formData.year),
            } as PlanningInsert;

            await savePlanning(payload);
            await loadData();
            setIsDialogOpen(false);
            setFormData(emptyForm); // Reset
        } catch (error) {
            console.error("Error saving planning:", error);
            alert("Erro ao salvar planejamento.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja desativar este planejamento?")) return;
        try {
            await deactivatePlanning(id);
            await loadData();
        } catch (error) {
            console.error("Error deleting planning:", error);
        }
    };

    const handleOpenDialog = () => {
        setFormData(emptyForm);
        setIsDialogOpen(true);
    }

    // Calculations for Table Row
    const calculatePhases = (row: any) => {
        const catId = row.account?.categoria_id;
        const category = categories.find(c => c.id === catId);
        return { category };
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Planejamento de Metas</h2>
                    <p className="text-sm text-slate-500">Defina metas de faturamento e acompanhe a evolução.</p>
                </div>
                <Button onClick={handleOpenDialog} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Plus size={16} /> Adicionar Planejamento
                </Button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Conta / Mês</TableHead>
                            <TableHead>Faturamento Meta</TableHead>
                            <TableHead>Ticket Médio</TableHead>
                            <TableHead>CPL Alvo</TableHead>
                            <TableHead>Fase 1</TableHead>
                            <TableHead>Fase 2</TableHead>
                            <TableHead>Fase 3</TableHead>
                            <TableHead>Fase 4</TableHead>
                            <TableHead className="w-[80px]">Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    <Loader2 className="animate-spin inline mr-2" /> Carregando...
                                </TableCell>
                            </TableRow>
                        ) : plannings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center text-slate-500">
                                    Nenhum planejamento ativo.
                                </TableCell>
                            </TableRow>
                        ) : (
                            plannings.map(row => {
                                const { category } = calculatePhases(row);
                                return (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-700">{row.account?.nome_ajustado || row.account?.nome_original || 'Conta Desconhecida'}</div>
                                            <div className="text-xs text-slate-500">
                                                {row.is_undefined ? (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 font-medium">
                                                        Indefinido
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                                        <Calendar size={12} /> {row.month}/{row.year}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-700">{formatCurrency(row.planned_revenue)}</TableCell>
                                        <TableCell>{formatCurrency(row.average_ticket)}</TableCell>
                                        <TableCell>
                                            {formatCurrency(row.cpl_average)}
                                            {row.cpl_custom && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">Manual</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">{category?.fase1_perc || '-'}%</TableCell>
                                        <TableCell className="text-xs text-slate-500">{category?.fase2_perc || '-'}%</TableCell>
                                        <TableCell className="text-xs text-slate-500">{category?.fase3_perc || '-'}%</TableCell>
                                        <TableCell className="text-xs text-slate-500">{category?.fase4_perc || '-'}%</TableCell>

                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                Ativo
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                                                <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Adicionar Planejamento</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                        {/* Account Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Conta de Anúncio</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.account_id}
                                onChange={(e) => setFormData(p => ({ ...p, account_id: e.target.value }))}
                            >
                                <option value="">Selecione uma conta...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.account_id}>
                                        {acc.display_name || acc.account_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date / Undefined Switch */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-100">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium text-slate-800">Planejamento Indefinido</label>
                                <p className="text-xs text-slate-500">Meta padrão recorrente</p>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                checked={formData.is_undefined || false}
                                onChange={(e) => setFormData(p => ({ ...p, is_undefined: e.target.checked }))}
                            />
                        </div>

                        {!formData.is_undefined && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Mês</label>
                                    <InputField
                                        type="number" min="1" max="12"
                                        value={formData.month || ''}
                                        onChange={(e) => setFormData(p => ({ ...p, month: parseInt(e.target.value) }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Ano</label>
                                    <InputField
                                        type="number" min="2024" max="2030"
                                        value={formData.year || ''}
                                        onChange={(e) => setFormData(p => ({ ...p, year: parseInt(e.target.value) }))}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Faturamento Meta (R$)</label>
                                <InputField
                                    type="number" step="0.01"
                                    value={formData.planned_revenue || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, planned_revenue: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Ticket Médio (R$)</label>
                                <InputField
                                    type="number" step="0.01"
                                    value={formData.average_ticket || ''}
                                    onChange={(e) => setFormData(p => ({ ...p, average_ticket: parseFloat(e.target.value) }))}
                                />
                            </div>
                        </div>

                        {/* CPL Logic */}
                        <div className="space-y-3 p-3 border border-slate-100 rounded-md">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">CPL Médio (R$)</label>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-normal text-slate-500">Usar Outro Valor</label>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                        checked={formData.cpl_custom || false}
                                        onChange={(e) => setFormData(p => ({ ...p, cpl_custom: e.target.checked }))}
                                    />
                                </div>
                            </div>
                            <InputField
                                type="number" step="0.01"
                                value={formData.cpl_average || ''}
                                disabled={!formData.cpl_custom}
                                className={`flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${!formData.cpl_custom ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
                                onChange={(e) => setFormData(p => ({ ...p, cpl_average: parseFloat(e.target.value) }))}
                            />
                        </div>

                        {/* Obs mandatory if Custom CPL */}
                        <div className="space-y-2">
                            <label className={`text-sm font-medium ${formData.cpl_custom ? "text-red-600" : "text-slate-700"}`}>
                                Observações {formData.cpl_custom && "*"}
                            </label>
                            <InputField
                                value={formData.observation || ''}
                                onChange={(e) => setFormData(p => ({ ...p, observation: e.target.value }))}
                                placeholder="Detalhes sobre a meta..."
                            />
                        </div>

                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : 'Salvar Planejamento'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
