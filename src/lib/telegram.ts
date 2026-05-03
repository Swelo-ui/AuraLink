const TG_BOT  = (import.meta.env.VITE_TG_BOT_TOKEN || '') as string;
const TG_CHAT = (import.meta.env.VITE_TG_CHAT_ID    || '') as string;
const TG_API  = `https://api.telegram.org/bot${TG_BOT}`;

export async function tgUploadFile(file: globalThis.File): Promise<{ file_id: string; message_id: number }> {
  const form = new FormData();
  form.append('chat_id', TG_CHAT);
  form.append('document', file, file.name);
  form.append('caption', `🗄 ${file.name}`);

  if (!TG_BOT || !TG_CHAT) {
    throw new Error('Telegram Bot Token or Chat ID is missing in .env. Please restart your dev server.');
  }

  const res  = await fetch(`${TG_API}/sendDocument`, { method: 'POST', body: form });
  const json = await res.json();
  
  if (!json.ok) {
    console.error('Telegram Error:', json);
    throw new Error(`Telegram upload failed: ${json.description || 'Not Found (Check Bot/Chat ID)'}`);
  }

  const result = json.result;
  const doc = result.document ?? result.video ?? result.audio ?? (result.photo ? result.photo[result.photo.length - 1] : null);
  
  if (!doc) throw new Error('Could not retrieve file_id from Telegram response');
  
  return { file_id: doc.file_id, message_id: result.message_id };
}

export async function tgGetFileUrl(file_id: string): Promise<string> {
  const res  = await fetch(`${TG_API}/getFile?file_id=${encodeURIComponent(file_id)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram getFile failed: ${json.description}`);
  return `https://api.telegram.org/file/bot${TG_BOT}/${json.result.file_path}`;
}

export async function tgDeleteMessage(message_id: number): Promise<void> {
  await fetch(`${TG_API}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, message_id }),
  });
}
