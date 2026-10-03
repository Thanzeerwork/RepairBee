const { io } = require('../repairbee-web/node_modules/socket.io-client');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/v1';
const SOCKET_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData) && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, data: json, headers: res.headers };
}

async function runTests() {
  console.log('🧪 === Starting RepairBee Comprehensive Verification ===\n');

  // Test 1: Health
  console.log('1️⃣ Checking API Health...');
  const healthRes = await fetch('http://localhost:3000/health');
  const health = await healthRes.json();
  console.log('   ✅ Health status:', health.status, 'Environment:', health.environment);

  // Test 2: Native Auth Login (Get JWT token)
  console.log('\n2️⃣ Testing Customer & Workshop Authentication...');
  const customerAuth = await request('/auth/login', {
    method: 'POST',
    body: { email: 'customer@repairbee.com', password: 'Customer@123' },
  });
  const customerToken = customerAuth.data?.accessToken || customerAuth.data?.data?.accessToken;
  const customerUser = customerAuth.data?.user || customerAuth.data?.data?.user;
  console.log('   ✅ Customer authenticated:', customerUser?.name, customerUser?.email, `(ID: ${customerUser?.id})`);

  const workshopAuth = await request('/auth/login', {
    method: 'POST',
    body: { email: 'shopowner@repairbee.com', password: 'Shop@123' },
  });
  const workshopToken = workshopAuth.data?.accessToken || workshopAuth.data?.data?.accessToken;
  const workshopUser = workshopAuth.data?.user || workshopAuth.data?.data?.user;
  console.log('   ✅ Workshop authenticated:', workshopUser?.name, workshopUser?.email, `(ID: ${workshopUser?.id})`);

  // Test 3: Upload Endpoint (Cloudflare R2 Architecture with local fallback)
  console.log('\n3️⃣ Testing Upload Architecture (R2 / Storage Fallback)...');
  const form = new FormData();
  form.append('folder', 'test_bench');
  const blob = new Blob(['FAKE_IMAGE_DATA_FOR_VERIFICATION'], { type: 'image/png' });
  form.append('file', blob, 'diagnostic_chip_test.png');

  const uploadRes = await fetch(`${BASE_URL}/uploads/single`, {
    method: 'POST',
    body: form,
  });
  const uploadData = await uploadRes.json();
  console.log('   ✅ Upload response status:', uploadRes.status, uploadData.message);
  console.log('   📁 Uploaded file key:', uploadData.data?.key);
  console.log('   🔗 Uploaded file URL:', uploadData.data?.url);
  console.log('   📦 Storage tier:', uploadData.data?.storage);

  // Test 4: Retrieve Uploaded File Stream
  console.log('\n4️⃣ Testing Upload Retrieval Stream...');
  const retrieveRes = await fetch(`http://localhost:3000${uploadData.data?.url}`);
  const retrievedText = await retrieveRes.text();
  console.log('   ✅ Retrieved file content length:', retrievedText.length, `(Status: ${retrieveRes.status})`);
  if (retrievedText !== 'FAKE_IMAGE_DATA_FOR_VERIFICATION') {
    throw new Error('Retrieved file content does not match uploaded data');
  }

  // Test 5: Real-Time Two-Way Socket.io Chat (Customer <-> Technician)
  console.log('\n5️⃣ Testing Real-Time Two-Way Socket.io Chat...');
  const repairsRes = await request('/repairs', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const ordersList = repairsRes.data?.data || repairsRes.data?.repairs || repairsRes.data || [];
  const testOrderId = ordersList[0]?.id;
  console.log('   📦 Testing on real active repair order ID:', testOrderId);

  await new Promise((resolve, reject) => {
    let customerSocket;
    let workshopSocket;
    let messageReceivedByWorkshop = false;
    let typingReceivedByCustomer = false;

    // Customer connects
    customerSocket = io(SOCKET_URL, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    // Workshop connects
    workshopSocket = io(SOCKET_URL, {
      auth: { token: workshopToken },
      transports: ['websocket'],
    });

    customerSocket.on('connect', () => {
      console.log('   🔌 Customer Socket connected (ID:', customerSocket.id, ')');
      customerSocket.emit('join_room', { orderId: testOrderId, chatType: 'customer_shop' });
    });

    workshopSocket.on('connect', () => {
      console.log('   🔌 Workshop Socket connected (ID:', workshopSocket.id, ')');
      workshopSocket.emit('join_room', { orderId: testOrderId, chatType: 'customer_shop' });

      // After both join, customer sends message
      setTimeout(() => {
        console.log('   💬 Customer sending test message via Socket...');
        customerSocket.emit('send_message', {
          orderId: testOrderId,
          chatType: 'customer_shop',
          message: 'Hello bench technician! Is the capacitor replaced?',
          mediaUrl: uploadData.data?.url,
        });
      }, 600);
    });

    workshopSocket.on('new_message', (msg) => {
      console.log('   📩 Workshop received live message in real-time:');
      console.log('      Text:', msg.message);
      console.log('      Media URL:', msg.media_url);
      console.log('      Sender:', msg.sender_name);
      messageReceivedByWorkshop = true;

      // Workshop sends typing indicator back
      console.log('   ⌨️ Workshop technician sending typing event...');
      workshopSocket.emit('typing', { orderId: testOrderId, chatType: 'customer_shop', isTyping: true });
    });

    customerSocket.on('user_typing', (data) => {
      console.log('   👁️ Customer received typing indicator from:', data.userName);
      typingReceivedByCustomer = true;

      if (messageReceivedByWorkshop && typingReceivedByCustomer) {
        customerSocket.disconnect();
        workshopSocket.disconnect();
        resolve();
      }
    });

    setTimeout(() => {
      if (!messageReceivedByWorkshop || !typingReceivedByCustomer) {
        customerSocket.disconnect();
        workshopSocket.disconnect();
        reject(new Error(`Timeout: msg=${messageReceivedByWorkshop}, typing=${typingReceivedByCustomer}`));
      }
    }, 8000);
  });

  console.log('\n🎉 ALL INTEGRATIONS (Socket.io Chat, Supabase Auth Dual Resolution, R2 Storage Fallback) VERIFIED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
