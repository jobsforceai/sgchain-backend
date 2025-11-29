import WebSocket from 'ws';
import { env } from '../core/config/env';

const runTest = () => {
  const wsUrl = env.SGCHAIN_WS_URL;

  console.log('--- Testing SGChain WebSocket Connection ---');
  
  if (!wsUrl) {
    console.error('❌ SGCHAIN_WS_URL is NOT set in environment variables.');
    process.exit(1);
  }

  console.log(`Connecting to: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('✅ Connection OPENED.');

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: ['newHeads'],
    };

    console.log('Sending subscription:', JSON.stringify(subscribeMsg));
    ws.send(JSON.stringify(subscribeMsg));
  });

  ws.on('message', (data) => {
    console.log('📩 Received Message:', data.toString());
    
    try {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'eth_subscription') {
            console.log('✨ NEW BLOCK HEADER RECEIVED!');
            // console.log(msg.params.result);
        }
    } catch (e) {
        console.error('Error parsing message:', e);
    }
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket ERROR:', err.message);
  });

  ws.on('close', (code, reason) => {
    console.warn(`⚠️ Connection CLOSED. Code: ${code}, Reason: ${reason.toString()}`);
  });

  // Keep alive for a bit to receive blocks
  setTimeout(() => {
    console.log('--- Test Timeout (30s) ---');
    ws.close();
    process.exit(0);
  }, 30000);
};

runTest();
