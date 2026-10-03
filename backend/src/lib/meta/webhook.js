import crypto from 'crypto';
export function verifySignature(req){
 const signature=req.headers['x-hub-signature-256'];
 if(!signature) return false;
 const expected='sha256='+crypto.createHmac('sha256',process.env.META_APP_SECRET).update(req.rawBody || JSON.stringify(req.body)).digest('hex');
 try{ return crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)); }catch{ return false; }
}
export function parseWebhook(body){
 const events=[];
 if(!body.entry) return events;
 for(const entry of body.entry){
   for(const change of entry.changes || []){
     if(change.field==='feed'){
       events.push({ type:'feed', pageId:entry.id, value:change.value });
     }
   }
   if(entry.messaging){
     for(const m of entry.messaging){
       events.push({ type:'messaging', pageId:entry.id, value:m });
     }
   }
 }
 return events;
}