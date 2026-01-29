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
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    CategoryRow,
    CategoryInsert
} from '../services/supabaseService';

export const CategoriesSettingsTab: React.FC = () => {
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const emptyCategory: Partial<CategoryInsert> = {
        nome_categoria: '',
        cpl_medio: 0,
        fase1_nome: '', fase1_perc: 0,
        fase2_nome: '', fase2_perc: 0,
        fase3_nome: '', fase3_perc: 0,
        fase4_nome: '', fase4_perc: 0,
    };
    const [formData, setFormData] = useState<Partial<CategoryInsert>>(emptyCategory);
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await fetchCategories();
            setCategories(data);
        } catch (error) {
            console.error("Error loading categories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleOpenDialog = (category?: CategoryRow) => {
        if (category) {
            setFormData({
                nome_categoria: category.nome_categoria,
                cpl_medio: category.cpl_medio || 0,
                fase1_nome: category.fase1_nome || '', fase1_perc: category.fase1_perc || 0,
                fase2_nome: category.fase2_nome || '', fase2_perc: category.fase2_perc || 0,
                fase3_nome: category.fase3_nome || '', fase3_perc: category.fase3_perc || 0,
                fase4_nome: category.fase4_nome || '', fase4_perc: category.fase4_perc || 0,
            });
            setEditingId(category.id);
        } else {
            setFormData(emptyCategory);
            setEditingId(null);
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.nome_categoria) return;

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                nome_categoria: formData.nome_categoria // Ensure it's string
            } as CategoryInsert;

            if (editingId) {
                await updateCategory(editingId, payload);
            } else {
                await createCategory(payload);
            }
            await loadCategories();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving category:", error);
            alert("Erro ao salvar categoria");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

        try {
            await deleteCategory(id);
            await loadCategories();
        } catch (error) {
            console.error("Error deleting category:", error);
            alert("Erro ao excluir categoria");
        }
    };

    const handlePercentageChange = (field: keyof CategoryInsert, value: string) => {
        const num = parseFloat(value) || 0;
        setFormData(prev => ({ ...prev, [field]: num }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Categorias de Clientes</h2>
                    <p className="text-sm text-slate-500">Gerencie as regras de CPL e fases do funil por categoria.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Plus size={16} /> Nova Categoria
                </Button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Nome</TableHead>
                            <TableHead>CPL Médio</TableHead>
                            <TableHead>Fase 1</TableHead>
                            <TableHead>Fase 2</TableHead>
                            <TableHead>Fase 3</TableHead>
                            <TableHead>Fase 4</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2 text-slate-500">
                                        <Loader2 className="animate-spin" size={20} /> Carregando...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    Nenhuma categoria encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.nome_categoria}</TableCell>
                                    <TableCell>R$ {cat.cpl_medio?.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <span className="font-bold">{cat.fase1_perc || 0}%</span>
                                            <div className="text-slate-400">{cat.fase1_nome || '-'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <span className="font-bold">{cat.fase2_perc || 0}%</span>
                                            <div className="text-slate-400">{cat.fase2_nome || '-'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <span className="font-bold">{cat.fase3_perc || 0}%</span>
                                            <div className="text-slate-400">{cat.fase3_nome || '-'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <span className="font-bold">{cat.fase4_perc || 0}%</span>
                                            <div className="text-slate-400">{cat.fase4_nome || '-'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cat)}>
                                                <Pencil size={16} className="text-slate-500 hover:text-indigo-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                                                <Trash2 size={16} className="text-slate-500 hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Categoria</label>
                                <Input
                                    value={formData.nome_categoria || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nome_categoria: e.target.value }))}
                                    placeholder="Ex: Clássica, Black, etc..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">CPL Médio (R$)</label>
                                <Input
                                    type="number"
                                    value={formData.cpl_medio || 0}
                                    onChange={(e) => handlePercentageChange('cpl_medio', e.target.value)}
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 my-2"></div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Fases do Funil</h3>

                        {/* Fases Grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {[1, 2, 3, 4].map(idx => (
                                <div key={idx} className="space-y-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <label className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Fase {idx}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <Input
                                                placeholder="Nome da Fase"
                                                className="h-8 text-xs bg-white"
                                                value={formData[`fase${idx}_nome` as keyof CategoryInsert] as string || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [`fase${idx}_nome`]: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="%"
                                                    className="h-8 text-xs bg-white pr-6"
                                                    value={formData[`fase${idx}_perc` as keyof CategoryInsert] as number || 0}
                                                    onChange={(e) => handlePercentageChange(`fase${idx}_perc` as keyof CategoryInsert, e.target.value)}
                                                />
                                                <span className="absolute right-2 top-1.5 text-xs text-slate-400">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                            ) : 'Salvar Categoria'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
