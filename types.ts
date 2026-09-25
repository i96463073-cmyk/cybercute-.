export type Platform='TikTok'|'Instagram'|'YouTube'|'Twitter'|'Spotify'|'Telegram'|'Facebook'|'Threads'|'Twitch';
export interface Service {id:number;name:string;category:string;platform:Platform;rate:number;originalRate?:number;min:number;max:number;dripfeed:boolean;refill:boolean;refillDays?:number;avgTime:string;description:string;speed:string;quality:'Standard'|'High Quality'|'Real Active'|'VIP Cute';providerServiceId?:number|string;}
export type OrderStatus='Pending'|'In Progress'|'Processing'|'Completed'|'Partial'|'Canceled';
export interface Order {id:number;serviceId:number;serviceName:string;platform:Platform;link:string;quantity:number;charge:number;startCount:number;remains:number;status:OrderStatus;createdAt:string;}
export interface PesapalConfig {consumerKey:string;consumerSecret:string;environment:'sandbox'|'live';ipnId?:string;callbackUrl?:string;currency:'KES'|'USD'|'UGX'|'TZS'|'RWF';status:'configured'|'unconfigured'|'connected'|'error';lastTested?:string;lastToken?:string;tokenExpires?:string;}
export interface ProviderConfig {id:string;name:string;apiUrl:string;apiKey:string;markupPercent:number;autoForward:boolean;}
