import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Configuration SendGrid
const SENDGRID_API_KEY = process.env.EMAIL_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'evriken77@gmail.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'SIGB UdM';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST EMAIL - Début du diagnostic');
    
    // Vérifier la configuration
    if (!SENDGRID_API_KEY) {
      console.error('❌ EMAIL_API_KEY manquante');
      return NextResponse.json({
        success: false,
        error: 'EMAIL_API_KEY manquante',
        config: {
          hasApiKey: false,
          fromEmail: FROM_EMAIL,
          fromName: FROM_NAME
        }
      }, { status: 500 });
    }

    console.log('✅ Configuration trouvée:', {
      hasApiKey: !!SENDGRID_API_KEY,
      apiKeyPrefix: SENDGRID_API_KEY.substring(0, 10) + '...',
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME
    });

    // Configurer SendGrid
    sgMail.setApiKey(SENDGRID_API_KEY);

    const body = await request.json();
    const { to = 'evriken77@gmail.com', subject = 'Test SIGB UdM' } = body;

    console.log('📧 Préparation email test vers:', to);

    // Message de test simple
    const msg = {
      to: to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Test Email SIGB UdM</h2>
          <p>Ceci est un email de test pour vérifier la configuration SendGrid.</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Informations de test:</h3>
            <ul>
              <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</li>
              <li><strong>Expéditeur:</strong> ${FROM_EMAIL}</li>
              <li><strong>Service:</strong> ${FROM_NAME}</li>
              <li><strong>API Key:</strong> ${SENDGRID_API_KEY.substring(0, 10)}...</li>
            </ul>
          </div>
          <p>Si vous recevez cet email, la configuration SendGrid fonctionne correctement !</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Université des Montagnes - Système Intégré de Gestion de Bibliothèque
          </p>
        </div>
      `,
      text: `
Test Email SIGB UdM

Ceci est un email de test pour vérifier la configuration SendGrid.

Informations de test:
- Date: ${new Date().toLocaleString('fr-FR')}
- Expéditeur: ${FROM_EMAIL}
- Service: ${FROM_NAME}
- API Key: ${SENDGRID_API_KEY.substring(0, 10)}...

Si vous recevez cet email, la configuration SendGrid fonctionne correctement !

Université des Montagnes - Système Intégré de Gestion de Bibliothèque
      `
    };

    console.log('📤 Envoi email via SendGrid...');
    
    // Envoyer l'email
    const response = await sgMail.send(msg);
    
    console.log('✅ Email envoyé avec succès!', {
      statusCode: response[0].statusCode,
      headers: response[0].headers
    });

    return NextResponse.json({
      success: true,
      message: 'Email de test envoyé avec succès',
      details: {
        to: to,
        from: FROM_EMAIL,
        subject: subject,
        statusCode: response[0].statusCode,
        messageId: response[0].headers['x-message-id']
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi email test:', error);
    
    // Analyser l'erreur SendGrid
    let errorDetails = {
      message: error.message,
      code: error.code,
      statusCode: error.response?.status,
      body: error.response?.body
    };

    if (error.response?.body?.errors) {
      console.error('📋 Détails erreurs SendGrid:', error.response.body.errors);
      errorDetails.sendgridErrors = error.response.body.errors;
    }

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de test',
      details: errorDetails,
      config: {
        hasApiKey: !!SENDGRID_API_KEY,
        fromEmail: FROM_EMAIL,
        fromName: FROM_NAME
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de test email SendGrid',
    usage: 'POST avec { "to": "email@example.com", "subject": "Test" }',
    config: {
      hasApiKey: !!SENDGRID_API_KEY,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME,
      notificationsEnabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true'
    }
  });
}
