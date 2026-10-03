import { supabaseAdmin } from '../supabaseClient.js';
import { normalizeEvent, shouldProcess } from './events.js';
import { handleCommentEvent } from './commentHandler.js';
import { handleDmEvent } from './messagingHandler.js';

export async function processRawEvents(rawEvents){
 for(const raw of rawEvents){
   const event=normalizeEvent(raw);
   if(!event) continue;
   const ok=await shouldProcess(event, supabaseAdmin);
   if(!ok) continue;
   if(event.kind==='comment') await handleCommentEvent(event);
   if(event.kind==='dm') await handleDmEvent(event);
 }
}