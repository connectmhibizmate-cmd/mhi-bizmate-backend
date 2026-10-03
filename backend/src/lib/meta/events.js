export function normalizeEvent(raw){
 if(raw.type==='feed'){
   const v=raw.value;
   if(v.item==='comment' && v.verb==='add'){
     return { kind:'comment', pageId:raw.pageId, commentId:v.comment_id, postId:v.post_id, message:v.message, from:v.from, parentId:v.parent_id || null };
   }
   return null;
 }
 if(raw.type==='messaging'){
   const v=raw.value;
   if(v.message){
     return { kind:'dm', pageId:raw.pageId, psid:v.sender.id, message:v.message.text, mid:v.message.mid };
   }
   return null;
 }
 return null;
}
export async function shouldProcess(event, supabase){
 if(!event) return false;
 const { data } = await supabase.from('meta_processed_events').select('id').eq('event_id', event.commentId || event.mid).single();
 return !data;
}