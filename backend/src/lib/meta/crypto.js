import crypto from 'crypto';
const ALGO='aes-256-gcm';
function getKey(){
 const raw=process.env.META_TOKEN_ENCRYPTION_KEY;
 if(!raw) throw new Error('Missing META_TOKEN_ENCRYPTION_KEY');
 return crypto.createHash('sha256').update(raw).digest();
}
export function encryptToken(text){
 const iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv(ALGO,getKey(),iv);
 let enc=cipher.update(text,'utf8','base64');
 enc+=cipher.final('base64');
 const tag=cipher.getAuthTag();
 return `${iv.toString('base64')}:${tag.toString('base64')}:${enc}`;
}
export function decryptToken(payload){
 const [ivB64,tagB64,data]=payload.split(':');
 const iv=Buffer.from(ivB64,'base64');
 const tag=Buffer.from(tagB64,'base64');
 const decipher=crypto.createDecipheriv(ALGO,getKey(),iv);
 decipher.setAuthTag(tag);
 let dec=decipher.update(data,'base64','utf8');
 dec+=decipher.final('utf8');
 return dec;
}
export function generateStateToken(){
 return crypto.randomBytes(32).toString('hex');
}