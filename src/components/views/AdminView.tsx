"use client";

import React, { useContext, useEffect } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { AppData, Equipment, System, Fault, Section, Relations, Area } from '@/lib/types';
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

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* Areas */}
      <Card>
        <CardHeader><CardTitle>Areas</CardTitle></CardHeader>
        <CardContent className="space-y-2">{data.areas && data.areas.map(item => <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded-md"><span>{item.name}</span><Button variant="ghost" size="icon" onClick={() => handleDeleteItem('areas', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
        <Dialog><DialogTrigger asChild><Button variant="outline" className="w-full mt-2"><PlusCircle className="mr-2 h-4 w-4"/> Add Area</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Add New Area</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const name = new FormData(e.currentTarget).get('name') as string; if(name) handleAddItem<Area>('areas', { name }); e.currentTarget.reset(); (document.getElementById('close-dialog-area') as HTMLElement).click(); }}>
            <div className="grid gap-4 py-4"><Label htmlFor="name-area">Name</Label><Input id="name-area" name="name" required /></div>
            <DialogFooter><DialogClose asChild><Button id="close-dialog-area" type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
            </form></DialogContent>
        </Dialog>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.equipment && data.equipment.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
              <span>{item.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteItem('equipment', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Equipment</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add New Equipment</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const name = formData.get('name') as string;
                        const tags = formData.get('tags') as string;
                        if(name) handleAddItem<Equipment>('equipment', { name, historianTags: tags.split(',').map(t => t.trim()) });
                        e.currentTarget.reset();
                        document.getElementById('close-dialog-equip')?.click();
                    }}>
                        <div className="grid gap-4 py-4">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" required />
                            <Label htmlFor="tags">Historian Tags (comma-separated)</Label>
                            <Input id="tags" name="tags" />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary" id="close-dialog-equip">Cancel</Button></DialogClose>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>
      
      {/* Systems */}
      <Card>
        <CardHeader><CardTitle>Systems</CardTitle></CardHeader>
        <CardContent className="space-y-2">{data.systems && data.systems.map(item => <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded-md"><span>{item.name}</span><Button variant="ghost" size="icon" onClick={() => handleDeleteItem('systems', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
        <Dialog><DialogTrigger asChild><Button variant="outline" className="w-full mt-2"><PlusCircle className="mr-2 h-4 w-4"/> Add System</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Add New System</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const name = fd.get('name') as string; const sectionId = fd.get('sectionId') as string; if(name && sectionId) handleAddItem<System>('systems', { name, sectionId }); e.currentTarget.reset(); (document.getElementById('close-dialog-sys') as HTMLElement).click(); }}>
            <div className="grid gap-4 py-4">
                <Label htmlFor="name-sys">Name</Label><Input id="name-sys" name="name" required />
                <Label htmlFor="section-sys">Section</Label>
                <Select name="sectionId" required><SelectTrigger><SelectValue placeholder="Select a section" /></SelectTrigger>
                    <SelectContent>{data.sections && data.sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <DialogFooter><DialogClose asChild><Button id="close-dialog-sys" type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
            </form></DialogContent>
        </Dialog>
        </CardContent>
      </Card>

      {/* Faults */}
      <Card>
        <CardHeader><CardTitle>Faults</CardTitle></CardHeader>
        <CardContent className="space-y-2">{data.faults && data.faults.map(item => <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded-md"><span>{item.name}</span><Button variant="ghost" size="icon" onClick={() => handleDeleteItem('faults', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
        <Dialog><DialogTrigger asChild><Button variant="outline" className="w-full mt-2"><PlusCircle className="mr-2 h-4 w-4"/> Add Fault</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Add New Fault</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const name = new FormData(e.currentTarget).get('name') as string; if(name) handleAddItem<Fault>('faults', { name }); e.currentTarget.reset(); (document.getElementById('close-dialog-fault') as HTMLElement).click(); }}>
            <div className="grid gap-4 py-4"><Label htmlFor="name-fault">Name</Label><Input id="name-fault" name="name" required /></div>
            <DialogFooter><DialogClose asChild><Button id="close-dialog-fault" type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
            </form></DialogContent>
        </Dialog>
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader><CardTitle>Sections</CardTitle></CardHeader>
        <CardContent className="space-y-2">{data.sections && data.sections.map(item => <div key={item.id} className="flex items-center justify-between p-2 bg-secondary rounded-md"><span className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: item.color}}></div>{item.name}</span><Button variant="ghost" size="icon" onClick={() => handleDeleteItem('sections', item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
        <Dialog><DialogTrigger asChild><Button variant="outline" className="w-full mt-2"><PlusCircle className="mr-2 h-4 w-4"/> Add Section</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Add New Section</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const name = fd.get('name') as string; const color = fd.get('color') as string; if(name && color) handleAddItem<Section>('sections', { name, color }); e.currentTarget.reset(); (document.getElementById('close-dialog-sec') as HTMLElement).click(); }}>
            <div className="grid gap-4 py-4"><Label htmlFor="name-sec">Name</Label><Input id="name-sec" name="name" required /><Label htmlFor="color-sec">Color</Label><Input id="color-sec" name="color" type="color" defaultValue="#3F51B5" /></div>
            <DialogFooter><DialogClose asChild><Button id="close-dialog-sec" type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit">Save</Button></DialogFooter>
            </form></DialogContent>
        </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

function RelationsManagementTab() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  if (!context) return null;

  const { data, setData } = context;
  const [selectedArea, setSelectedArea] = React.useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = React.useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = React.useState<string | null>(null);

  const [pendingRelations, setPendingRelations] = React.useState<Relations>(data.relations);

  useEffect(() => {
    setPendingRelations(data.relations);
  }, [data.relations]);

  const handleAreaEquipmentChange = (equipmentId: string, checked: boolean) => {
    if (!selectedArea) return;
    setPendingRelations(prev => {
        const newRelations = JSON.parse(JSON.stringify(prev));
        const currentEquipment = newRelations.areaToEquipment[selectedArea] || [];
        if (checked) {
            newRelations.areaToEquipment[selectedArea] = [...new Set([...currentEquipment, equipmentId])];
        } else {
            newRelations.areaToEquipment[selectedArea] = currentEquipment.filter((id: string) => id !== equipmentId);
        }
        return newRelations;
    });
  }

  const handleEquipmentSystemChange = (systemId: string, checked: boolean) => {
    if (!selectedEquipment) return;
    setPendingRelations(prev => {
        const newRelations = JSON.parse(JSON.stringify(prev));
        const currentSystems = newRelations.equipmentToSystem[selectedEquipment] || [];
        if (checked) {
            newRelations.equipmentToSystem[selectedEquipment] = [...new Set([...currentSystems, systemId])];
        } else {
            newRelations.equipmentToSystem[selectedEquipment] = currentSystems.filter((id: string) => id !== systemId);
        }
        return newRelations;
    });
  }
  
  const handleSystemFaultChange = (faultId: string, checked: boolean) => {
    if (!selectedSystem) return;
    setPendingRelations(prev => {
        const newRelations = JSON.parse(JSON.stringify(prev));
        const currentFaults = newRelations.systemToFaults[selectedSystem] || [];
        if (checked) {
            newRelations.systemToFaults[selectedSystem] = [...new Set([...currentFaults, faultId])];
        } else {
            newRelations.systemToFaults[selectedSystem] = currentFaults.filter((id: string) => id !== faultId);
        }
        return newRelations;
    });
  }

  const handleSaveRelations = () => {
    setData(prev => ({...prev, relations: pendingRelations}));
    toast({ title: "Success", description: "Relations saved successfully." });
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader><CardTitle>Area ➞ Equipment</CardTitle><CardDescription>Select an area to manage its equipment.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <Select onValueChange={setSelectedArea}>
                <SelectTrigger><SelectValue placeholder="Select Area..." /></SelectTrigger>
                <SelectContent>{data.areas && data.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedArea && <div className="space-y-2 pt-4">
                <h4 className="font-medium">Associated Equipment</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {data.equipment && data.equipment.map(eq => (
                        <div key={eq.id} className="flex items-center space-x-2">
                            <Checkbox id={`area-eq-${eq.id}`}
                                checked={pendingRelations.areaToEquipment[selectedArea]?.includes(eq.id) ?? false}
                                onCheckedChange={(checked) => handleAreaEquipmentChange(eq.id, !!checked)}
                            />
                            <label htmlFor={`area-eq-${eq.id}`}>{eq.name}</label>
                        </div>
                    ))}
                </div>
            </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Equipment ➞ Systems</CardTitle><CardDescription>Select equipment to manage its associated systems.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <Select onValueChange={setSelectedEquipment}>
                <SelectTrigger><SelectValue placeholder="Select Equipment..." /></SelectTrigger>
                <SelectContent>{data.equipment && data.equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedEquipment && <div className="space-y-2 pt-4">
                <h4 className="font-medium">Associated Systems</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {data.systems && data.systems.map(sys => (
                        <div key={sys.id} className="flex items-center space-x-2">
                            <Checkbox id={`eq-sys-${sys.id}`}
                                checked={pendingRelations.equipmentToSystem[selectedEquipment]?.includes(sys.id) ?? false}
                                onCheckedChange={(checked) => handleEquipmentSystemChange(sys.id, !!checked)}
                            />
                            <label htmlFor={`eq-sys-${sys.id}`}>{sys.name}</label>
                        </div>
                    ))}
                </div>
            </div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>System ➞ Faults</CardTitle><CardDescription>Select a system to manage its possible faults.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <Select onValueChange={setSelectedSystem}>
                <SelectTrigger><SelectValue placeholder="Select System..." /></SelectTrigger>
                <SelectContent>{data.systems && data.systems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedSystem && <div className="space-y-2 pt-4">
                <h4 className="font-medium">Associated Faults</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {data.faults && data.faults.map(fault => (
                        <div key={fault.id} className="flex items-center space-x-2">
                            <Checkbox id={`sys-fault-${fault.id}`}
                                checked={pendingRelations.systemToFaults[selectedSystem]?.includes(fault.id) ?? false}
                                onCheckedChange={(checked) => handleSystemFaultChange(fault.id, !!checked)}
                            />
                            <label htmlFor={`sys-fault-${fault.id}`}>{fault.name}</label>
                        </div>
                    ))}
                </div>
            </div>}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSaveRelations}>
            <Save className="mr-2 h-4 w-4" /> Save All Relations
        </Button>
      </div>
    </div>
  );
}

function ImportExportTab() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  if (!context) return null;
  const { data, setData } = context;

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
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
        <TabsTrigger value="data">Data Management</TabsTrigger>
        <TabsTrigger value="relations">Relations Manager</TabsTrigger>
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
