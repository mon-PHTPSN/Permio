export interface PreviewStorage { getItem(key:string): string|null; setItem(key:string,value:string):void }
export interface DemoContext { id:string; caseId:string; profileId:string; policyId:string; name:string }
export interface DemoPermission {
  id:string; contextId:string; authorizedParty:string; recipient:string; action:string; purpose:string; claims:string[];
  notBefore:number; expiresAt:number; recordedAt:number; revokedAt:number|null; delegationAllowed:false;
  authoritySource:string; proofStatus:string; proof:null; receipt:null; execution:null; status?:string;
}
export interface DemoDisclosure {
  id:string; contextId:string; recipient:string; purpose:string; claims:string[]; duration:number; status:string; createdAt:number;
  review:{rating:number;review_text:string}|null; permissionId?:string; consentedAt?:number; delivered?:false;
}
export interface DemoWorkspace {
  schemaVersion:1; accountId:string; revision:number;
  cases:{id:string;profileId:string;title:string;createdAt:number}[]; contexts:DemoContext[]; permissions:DemoPermission[];
  requests:DemoDisclosure[]; history:{id:string;contextId:string;label:string;kind:string;at:number}[];
}
export interface ContextPreview {
  id:string; revision:number; kind:string; requestId:string|null; contextId:string; contextName:string; caseTitle:string;
  recipient:string; authorizedParty:string; action:string; purpose:string; claims:string[];
  review:{rating:number;review_text:string}|null; visible:{id:string;label:string}[]; hidden:string[]; checks:string[];
  bridge:boolean; delegationAllowed:false; notBefore:number; expiresAt:number; confirmBefore:number;
}
export interface ContextClient {
  list():Promise<DemoWorkspace>;
  createContext(input:Record<string,unknown>):Promise<DemoWorkspace["cases"][number]>;
  previewPermission(input:Record<string,unknown>):Promise<ContextPreview>;
  confirmPermission(previewId:string,bridgeConsent?:boolean):Promise<DemoPermission>;
  revokePermission(id:string):Promise<DemoPermission>;
  createDisclosure(input:Record<string,unknown>):Promise<DemoDisclosure>;
  previewDisclosure(input:Record<string,unknown>):Promise<ContextPreview>;
  approveDisclosure(previewId:string,bridgeConsent?:boolean):Promise<DemoDisclosure>;
  declineDisclosure(id:string):Promise<DemoDisclosure>;
  requestVerification(id:string):Promise<DemoPermission>;
  dispose():void;
}
export function permissionState(permission:DemoPermission,now?:number):string;
export class LocalContextClient implements ContextClient {
  constructor(options:{accountId:string;storage:PreviewStorage;now?:()=>number;makeId?:()=>string});
  readonly key:string;
  list:ContextClient["list"]; createContext:ContextClient["createContext"];
  previewPermission:ContextClient["previewPermission"]; confirmPermission:ContextClient["confirmPermission"];
  revokePermission:ContextClient["revokePermission"]; createDisclosure:ContextClient["createDisclosure"];
  previewDisclosure:ContextClient["previewDisclosure"]; approveDisclosure:ContextClient["approveDisclosure"];
  declineDisclosure:ContextClient["declineDisclosure"]; requestVerification:ContextClient["requestVerification"];
  dispose():void;
}
export class HttpContextClient implements ContextClient {
  constructor(request:(path:string,method?:string,body?:unknown)=>Promise<any>);
  list:ContextClient["list"]; createContext:ContextClient["createContext"];
  previewPermission:ContextClient["previewPermission"]; confirmPermission:ContextClient["confirmPermission"];
  revokePermission:ContextClient["revokePermission"]; createDisclosure:ContextClient["createDisclosure"];
  previewDisclosure:ContextClient["previewDisclosure"]; approveDisclosure:ContextClient["approveDisclosure"];
  declineDisclosure:ContextClient["declineDisclosure"]; requestVerification:ContextClient["requestVerification"];
  dispose():void;
}
