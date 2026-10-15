import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn('GROQ_API_KEY not set - chat endpoint will return 503');
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

router.post('/chat', authenticate, async (req: Request, res: Response) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'Chat service not configured' });
  }

  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = `You are GuideTrack Assistant, a helpful AI for UPHSD Calamba's Guidance Management System.

ABOUT GUIDETRACK:
- GuideTrack is the Guidance Management System for University of Perpetual Help System DALTA – Calamba Campus
- A BSCpE research study (CPE Practice and Design) approved June 16, 2025
- Streamlines counseling appointments, records, and communication for the College of Engineering

KEY FEATURES:
- Appointment booking with counselors (4 available counselors)
- Report concerns (academic, personal, career, mental health, financial, other)
- View announcements from guidance office
- Access guidance resources
- Submit and track referrals (faculty to guidance office)
- Role-based access: Admin, Counselor, Student, Faculty

COUNSELORS:
1. Ma. Clarissn H. Cardino, REC, RPm - Guidance Coordinator (Allied Health & Business Clusters)
2. Anne Gelp B. Vanguardia, RC, RPm - Guidance Counselor (Technology & HUMSS Cluster)
3. Alodia M. Endrinal - Guidance Associate
4. Brian Nickie B. Guevarra, RPm - Psychometrician

YOU CAN HELP WITH:
- Booking counseling appointments
- Reporting concerns
- Navigating the system
- General guidance questions
- Campus resources

Keep responses helpful, concise, and friendly.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Groq error:', error);
      return res.status(500).json({ error: 'Chat service error' });
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ reply });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat service error' });
  }
});

export default router;