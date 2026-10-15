import { ChatMessage, PolicyRole } from '../types';

export function exportChatToCSV(messages: ChatMessage[], currentRole: PolicyRole, employeeId: string) {
  const headers = ['Timestamp', 'Role', 'Sender', 'Message', 'Citations'];
  
  const rows = messages.map(msg => {
    const citationsStr = (msg.citations || []).map(c => `P.${c.pageNumber}: ${c.title}`).join(' | ');
    const cleanText = msg.text.replace(/"/g, '""').replace(/\n/g, ' ');
    return [
      `"${msg.timestamp}"`,
      `"${msg.role}"`,
      `"${msg.sender}"`,
      `"${cleanText}"`,
      `"${citationsStr}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const filename = `insighte-policy-chat-${currentRole}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportChatToPDF() {
  window.print();
}

export function generateShareText(messages: ChatMessage[]): string {
  const conversation = messages
    .filter(m => m.sender !== 'system')
    .map(m => {
      const prefix = m.sender === 'user' ? '❓ Query:' : '💡 Insighte Policy Bot:';
      const cites = (m.citations && m.citations.length > 0)
        ? `\n[Citations: ${m.citations.map(c => `Page ${c.pageNumber}: ${c.title}`).join(', ')}]`
        : '';
      return `${prefix}\n${m.text}${cites}`;
    })
    .join('\n\n---\n\n');

  return `*Insighte Policy Assistant Consultation Summary*\n\n${conversation}\n\nGenerated from Insighte Policy AI Portal`;
}

export function shareToWhatsApp(messages: ChatMessage[]) {
  const text = generateShareText(messages);
  const encoded = encodeURIComponent(text.slice(0, 3000)); // limit length for URL safety
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}

export function shareViaEmail(messages: ChatMessage[], role: PolicyRole) {
  const subject = encodeURIComponent(`Insighte Policy Inquiry Record - ${role.toUpperCase()}`);
  const body = encodeURIComponent(generateShareText(messages));
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
  window.location.href = mailtoUrl;
}

export async function copyTranscript(messages: ChatMessage[]): Promise<boolean> {
  try {
    const text = generateShareText(messages);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}
