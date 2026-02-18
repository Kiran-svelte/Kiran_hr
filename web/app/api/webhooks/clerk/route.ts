import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    // Get the headers
    const svix_id = req.headers.get('svix-id');
    const svix_timestamp = req.headers.get('svix-timestamp');
    const svix_signature = req.headers.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Verify the webhook
    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the webhook
    const eventType = evt.type;
    const userData = evt.data;

    switch (eventType) {
      case 'user.created':
      case 'user.updated':
        // Auto-create or update Employee record
        const email = userData.email_addresses?.[0]?.email_address;
        const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();

        if (email) {
          // Generate a more robust employee ID using UUID
          const empId = `EMP-${userData.id.substring(0, 8)}`;
          
          await prisma.employee.upsert({
            where: { email },
            update: {
              clerk_id: userData.id,
              full_name: fullName || email
            },
            create: {
              emp_id: empId,
              clerk_id: userData.id,
              email,
              full_name: fullName || email,
              role: 'employee'
            }
          });
        }
        break;

      case 'user.deleted':
        // Optionally deactivate employee
        if (userData.id) {
          await prisma.employee.updateMany({
            where: { clerk_id: userData.id },
            data: { is_active: false }
          });
        }
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
