"use client";

import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { AppData, Equipment, System, Fault, Responsibility, Relations, Area } from '@/lib/types';
import { PlusCircle, Trash2, Download, Upload, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


function DataManagementTab() {
  const context = useContext(AppContext);
  if (!context) return null;
  const { data, setData } = context;

  // Generic CRUD functions
  const handleAddItem = <T extends { id: string, name: string }>(type: keyof AppData, newItem: Omit<T, 'id'>) => {
    setData(prev => {
        const items = prev[type] as T[] || [];
        const fullItem = { ...newItem, id: `${type.toString().slice(0, 4)}-${Date.now()}` } as T;
        return {...prev, [type]: [...items, fullItem]}
    });
  };

  const handleDeleteItem = (type: keyof AppData, id: string) => {
    setData(prev => {
        const items = prev[type] as {id: string}[] || [];
        return {...prev, [type]: items.filter(item => item.id !== id)}
    });
  };
  
  const dataCategories = [
    { key: 'areas' as const, title: 'Areas', fields: [{ name: 'name', label: 'Name', type: 'text' }] },
    { key: 'equipment' as const, title: 'Equipment', fields: [{ name: 'name', label: 'Name', type: 'text' }, { name: 'tags', label: 'Historian Tags (comma-separated)', type: 'text' }] },
    { key: 'systems' as const, title: 'Systems', fields: [{ name: 'name', label: 'Name', type: 'text' }] },
    { key: 'responsibilities' as const, title: 'Responsibilities', fields: [{ name: 'name', label: 'Name', type: 'text' }, { name: 'color', label: 'Color', type: 'color' }] },
    { key: 'faults' as const, title: 'Faults', fields: [{ name: 'name', label: 'Name', type: 'text' }] },
  ];

  const renderItem = (item: any, catKey: keyof AppData) => {
    if (catKey === 'responsibilities') {
      const resp = item as Responsibility;
      return <span className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: resp.color}}></div>{resp.name}</span>
    }
    return <span>{item.name}</span>;
  }
  
  const getTypedItem = (formData: FormData, catKey: keyof AppData) => {
    const name = formData.get('name') as string;
    if (!name) return null;

    switch(catKey) {
        case 'areas': return { name } as Omit<Area, 'id'>;
        case 'equipment': 
            const tags = formData.get('tags') as string;
            return { name, historianTags: tags ? tags.split(',').map(t => t.trim()) : [] } as Omit<Equipment, 'id'>;
        case 'systems': return { name } as Omit<System, 'id'>;
        case 'responsibilities':
            const color = formData.get('color') as string;
            return { name, color: color || '#cccccc' } as Omit<Responsibility, 'id'>;
        case 'faults': return { name } as Omit<Fault, 'id'>;
        default: return null;
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {dataCategories.map(cat => (
        <Card key={cat.key}>
          <CardHeader><CardTitle>{cat.title}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <ScrollArea className="h-64">
              {(data[cat.key] as any[] || []).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 mb-2 bg-secondary rounded-md">
                  {renderItem(item, cat.key)}
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(cat.key, item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </ScrollArea>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" className="w-full mt-2"><PlusCircle className="mr-2 h-4 w-4"/> Add {cat.title.slice(0, -1)}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New {cat.title.slice(0, -1)}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    const itemData = getTypedItem(new FormData(e.currentTarget), cat.key);
                    if (itemData) handleAddItem(cat.key, itemData as any);
                    e.currentTarget.reset();
                    (document.getElementById(`close-dialog-${cat.key}`) as HTMLElement).click(); 
                }}>
                  <div className="grid gap-4 py-4">
                    {cat.fields.map(field => (
                      <React.Fragment key={field.name}>
                        <Label htmlFor={`${field.name}-${cat.key}`}>{field.label}</Label>
                        <Input id={`${field.name}-${cat.key}`} name={field.name} type={field.type} required={field.name === 'name'} defaultValue={field.type === 'color' ? '#3F51B5' : ''}/>
                      </React.Fragment>
                    ))}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button id={`close-dialog-${cat.key}`} type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


function RelationsManagementTab() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  if (!context) return null;

  const { data, setData } = context;
  const [relationType, setRelationType] = useState('areaToEquipment');
  
  // State for Area -> Equipment
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedEquipmentForArea, setSelectedEquipmentForArea] = useState<string[]>([]);

  // State for Equipment -> Systems
  const [selectedEquipmentForSystem, setSelectedEquipmentForSystem] = useState<string[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);

  // State for System -> Responsibility -> Fault
  const [selectedSystemForFaults, setSelectedSystemForFaults] = useState<string>('');
  const [selectedResponsibility, setSelectedResponsibility] = useState<string>('');
  const [selectedFaults, setSelectedFaults] = useState<string[]>([]);


  useEffect(() => {
    if (relationType === 'areaToEquipment' && selectedArea) {
      setSelectedEquipmentForArea(data.relations.areaToEquipment?.[selectedArea] || []);
    }
  }, [selectedArea, data.relations.areaToEquipment, relationType]);

  useEffect(() => {
     if (relationType === 'equipmentToSystem' && selectedEquipmentForSystem.length > 0) {
        const allSystems = selectedEquipmentForSystem.flatMap(eqId => data.relations.equipmentToSystem?.[eqId] || []);
        setSelectedSystems(Array.from(new Set(allSystems)));
     } else {
        setSelectedSystems([]);
     }
  }, [selectedEquipmentForSystem, data.relations.equipmentToSystem, relationType]);

  useEffect(() => {
    if (relationType === 'systemToResponsibility' && selectedSystemForFaults && selectedResponsibility) {
      setSelectedFaults(data.relations.systemToResponsibilityToFaults?.[selectedSystemForFaults]?.[selectedResponsibility] || []);
    } else {
        setSelectedFaults([]);
    }
  }, [selectedSystemForFaults, selectedResponsibility, data.relations.systemToResponsibilityToFaults, relationType]);
  
  // Reset selections when relation type changes
  useEffect(() => {
    setSelectedArea('');
    setSelectedEquipmentForArea([]);
    setSelectedEquipmentForSystem([]);
    setSelectedSystems([]);
    setSelectedSystemForFaults('');
    setSelectedResponsibility('');
    setSelectedFaults([]);
  }, [relationType]);


  const handleSaveAreaToEquipment = () => {
    if (!selectedArea) return;
    setData(prev => {
        const newRelations = JSON.parse(JSON.stringify(prev.relations));
        newRelations.areaToEquipment[selectedArea] = selectedEquipmentForArea;
        return {...prev, relations: newRelations };
    });
    toast({ title: "Success", description: "Area to Equipment relation saved." });
  }

  const handleSaveEquipmentToSystems = () => {
    if (selectedEquipmentForSystem.length === 0) return;
    setData(prev => {
        const newRelations = JSON.parse(JSON.stringify(prev.relations));
        selectedEquipmentForSystem.forEach(eqId => {
            newRelations.equipmentToSystem[eqId] = selectedSystems;
        });
        return {...prev, relations: newRelations};
    });
     toast({ title: "Success", description: "Equipment to Systems relation saved." });
  }

  const handleSaveSystemResponsibilityFaults = () => {
    if (!selectedSystemForFaults || !selectedResponsibility) return;
    setData(prev => {
        const newRelations = JSON.parse(JSON.stringify(prev.relations));
        if (!newRelations.systemToResponsibilityToFaults) {
            newRelations.systemToResponsibilityToFaults = {};
        }
        if (!newRelations.systemToResponsibilityToFaults[selectedSystemForFaults]) {
            newRelations.systemToResponsibilityToFaults[selectedSystemForFaults] = {};
        }
        newRelations.systemToResponsibilityToFaults[selectedSystemForFaults][selectedResponsibility] = selectedFaults;
        return {...prev, relations: newRelations};
    });
    toast({ title: "Success", description: "System, Responsibility and Faults relation saved." });
  }

  const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, checked: boolean) => {
    setter(prev => {
        if (checked) {
            return [...prev, value];
        } else {
            return prev.filter(v => v !== value);
        }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relations Builder</CardTitle>
        <CardDescription>Define the relationships between your data entities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label>Relation Type</Label>
        <Select value={relationType} onValueChange={setRelationType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="areaToEquipment">Area ➞ Equipment</SelectItem>
            <SelectItem value="equipmentToSystem">Equipment ➞ Systems</SelectItem>
            <SelectItem value="systemToResponsibility">System ➞ Responsibility ➞ Fault Types</SelectItem>
          </SelectContent>
        </Select>

        {relationType === 'areaToEquipment' && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Step 1: Link Equipment to an Area</h3>
            <Label>Select an Area</Label>
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger><SelectValue placeholder="Choose an area..." /></SelectTrigger>
              <SelectContent>
                {data.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedArea && (
              <div className="space-y-2">
                <Label>Select Equipment</Label>
                <ScrollArea className="h-48 p-4 border rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    {data.equipment.map(eq => (
                      <div key={eq.id} className="flex items-center space-x-2">
                        <Checkbox id={`area-eq-${eq.id}`}
                          checked={selectedEquipmentForArea.includes(eq.id)}
                          onCheckedChange={(checked) => handleMultiSelect(setSelectedEquipmentForArea, eq.id, !!checked)}
                        />
                        <label htmlFor={`area-eq-${eq.id}`} className="text-sm">{eq.name}</label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                 <Button onClick={handleSaveAreaToEquipment}><Save className="mr-2 h-4 w-4"/> Save Relation</Button>
              </div>
            )}
          </div>
        )}

        {relationType === 'equipmentToSystem' && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Step 2: Link Systems to Equipment</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <Label>Select Equipment (one or more)</Label>
                  <ScrollArea className="h-48 p-4 border rounded-md">
                    <div className="space-y-2">
                        {data.equipment.map(eq => (
                            <div key={eq.id} className="flex items-center space-x-2">
                                <Checkbox id={`eq-sys-eq-${eq.id}`}
                                checked={selectedEquipmentForSystem.includes(eq.id)}
                                onCheckedChange={(checked) => handleMultiSelect(setSelectedEquipmentForSystem, eq.id, !!checked)}
                                />
                                <label htmlFor={`eq-sys-eq-${eq.id}`} className="text-sm">{eq.name}</label>
                            </div>
                        ))}
                    </div>
                 </ScrollArea>
              </div>
               <div className="space-y-2">
                 <Label>Select Systems (one or more)</Label>
                  <ScrollArea className="h-48 p-4 border rounded-md">
                     <div className="space-y-2">
                        {data.systems.map(sys => (
                            <div key={sys.id} className="flex items-center space-x-2">
                                <Checkbox id={`eq-sys-sys-${sys.id}`}
                                checked={selectedSystems.includes(sys.id)}
                                onCheckedChange={(checked) => handleMultiSelect(setSelectedSystems, sys.id, !!checked)}
                                />
                                <label htmlFor={`eq-sys-sys-${sys.id}`} className="text-sm">{sys.name}</label>
                            </div>
                        ))}
                    </div>
                 </ScrollArea>
              </div>
            </div>
            <Button onClick={handleSaveEquipmentToSystems}><Save className="mr-2 h-4 w-4"/> Save Relation</Button>
          </div>
        )}

        {relationType === 'systemToResponsibility' && (
           <div className="space-y-4 pt-4 border-t">
             <h3 className="font-semibold">Step 3: Link Faults to System and Responsibility</h3>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Select a System</Label>
                    <Select value={selectedSystemForFaults} onValueChange={setSelectedSystemForFaults}>
                        <SelectTrigger><SelectValue placeholder="Choose a system..." /></SelectTrigger>
                        <SelectContent>
                            {data.systems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label>Select a Responsibility</Label>
                     <Select value={selectedResponsibility} onValueChange={setSelectedResponsibility}>
                        <SelectTrigger><SelectValue placeholder="Choose a responsibility..." /></SelectTrigger>
                        <SelectContent>
                            {data.responsibilities.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
             {selectedSystemForFaults && selectedResponsibility && (
                <div className="space-y-2">
                    <Label>Select Faults</Label>
                    <ScrollArea className="h-48 p-4 border rounded-md">
                        <div className="grid grid-cols-2 gap-2">
                        {data.faults.map(f => (
                            <div key={f.id} className="flex items-center space-x-2">
                            <Checkbox id={`fault-${f.id}`}
                                checked={selectedFaults.includes(f.id)}
                                onCheckedChange={(checked) => handleMultiSelect(setSelectedFaults, f.id, !!checked)}
                            />
                            <label htmlFor={`fault-${f.id}`} className="text-sm">{f.name}</label>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                    <Button onClick={handleSaveSystemResponsibilityFaults}><Save className="mr-2 h-4 w-4"/> Save Relation</Button>
                </div>
             )}
           </div>
        )}

      </CardContent>
    </Card>
  );
}



function ImportExportTab() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  if (!context) return null;
  const { data, setData } = context;

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "equiptrack-ai-data.json";
    link.click();
    toast({ title: "Success", description: "Data exported successfully." });
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("Invalid file content");
            const importedData = JSON.parse(text);
            // Basic validation
            if (importedData.equipment && importedData.systems && importedData.bookings) {
                setData(importedData);
                toast({ title: "Success", description: "Data imported successfully." });
            } else {
                throw new Error("Invalid data structure");
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Import Failed", description: "The selected file is not valid." });
        }
    }
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import / Export Data</CardTitle>
        <CardDescription>
          Save all your application data to a file, or load data from a file. This is useful for backups or transferring settings.
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-4">
        <Button onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export Data</Button>
        <Button asChild variant="outline">
            <Label htmlFor="import-file"><Upload className="mr-2 h-4 w-4" /> Import Data</Label>
        </Button>
        <Input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImport} />
      </CardFooter>
    </Card>
  )
}

export default function AdminView() {
  return (
    <Tabs defaultValue="data" className="space-y-4">
      <TabsList>
        <TabsTrigger value="data">Data Manager</TabsTrigger>
        <TabsTrigger value="relations">Relations Builder</TabsTrigger>
        <TabsTrigger value="import-export">Import/Export</TabsTrigger>
      </TabsList>
      <TabsContent value="data">
        <DataManagementTab />
      </TabsContent>
      <TabsContent value="relations">
        <RelationsManagementTab />
      </TabsContent>
      <TabsContent value="import-export">
        <ImportExportTab />
      </TabsContent>
    </Tabs>
  );
}
