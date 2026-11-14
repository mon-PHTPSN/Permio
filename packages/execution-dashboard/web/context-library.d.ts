import type { ScenarioTemplate } from "@permio/scenario-domain";
import type { TemplateTarget } from "@permio/scenario-governance";

export interface LibraryEntry {
  id:string; state:string; myRole:string|undefined; owner:string;
  template:ScenarioTemplate; target:TemplateTarget;
}
export interface LibraryInstance {
  id:string; name:string; blueprintName:string; state:string; createdAt:number; expiresAt:number;
  participants:string[]; issuer:string|null; template?:ScenarioTemplate; target?:TemplateTarget;
}
export function escapeText(value:unknown):string;
export function libraryCards(items:LibraryEntry[],options?:{selecting?:boolean}):string;
export function templateDefinition(template:ScenarioTemplate):string;
export function instanceCards(instances:LibraryInstance[]):string;
export function instanceDefinition(instance:LibraryInstance):string;
export function newTemplateDefinition():ScenarioTemplate;
