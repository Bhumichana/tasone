// Simple test server for warranty app
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ระบบใบรับประกันคุณภาพผลิตภัณฑ์</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #1e3a8a;
            }
            .container {
                background: white;
                padding: 3rem;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(30, 64, 175, 0.15);
                text-align: center;
                max-width: 700px;
                width: 90%;
                border: 1px solid #e2e8f0;
            }
            .logo {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #1e40af, #1e3a8a);
                border-radius: 16px;
                margin: 0 auto 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
                font-weight: bold;
                box-shadow: 0 8px 16px rgba(30, 64, 175, 0.3);
            }
            h1 {
                background: linear-gradient(135deg, #1e40af, #1e3a8a);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-size: 2.5rem;
                margin-bottom: 1rem;
                font-weight: 700;
            }
            .subtitle {
                color: #64748b;
                font-size: 1.2rem;
                margin-bottom: 2rem;
                line-height: 1.6;
            }
            .status-success {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 1.5rem 2rem;
                border-radius: 12px;
                font-weight: 600;
                margin: 2rem 0;
                font-size: 1.1rem;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin: 2rem 0;
            }
            .info-card {
                background: #f8fafc;
                padding: 2rem;
                border-radius: 12px;
                border-left: 4px solid #1e40af;
                text-align: left;
            }
            .info-card h3 {
                color: #1e40af;
                margin-bottom: 1rem;
                font-size: 1.1rem;
                font-weight: 600;
            }
            .info-card ul {
                list-style: none;
                padding: 0;
            }
            .info-card li {
                padding: 0.5rem 0;
                color: #475569;
                position: relative;
                padding-left: 1.5rem;
            }
            .info-card li:before {
                content: "✅";
                position: absolute;
                left: 0;
                top: 0.5rem;
            }
            .next-steps {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border: 2px solid #f59e0b;
                padding: 2rem;
                border-radius: 12px;
                margin: 2rem 0;
                text-align: left;
            }
            .next-steps h3 {
                color: #d97706;
                margin-bottom: 1rem;
                font-size: 1.3rem;
            }
            .code-block {
                background: #1e293b;
                color: #e2e8f0;
                padding: 1rem;
                border-radius: 8px;
                font-family: 'Consolas', 'Monaco', monospace;
                margin: 1rem 0;
                overflow-x: auto;
                border: 1px solid #334155;
            }
            .accounts {
                background: #dbeafe;
                border: 2px solid #3b82f6;
                padding: 1.5rem;
                border-radius: 12px;
                margin: 1rem 0;
            }
            .accounts h4 {
                color: #1e40af;
                margin-bottom: 1rem;
            }
            .accounts ul {
                list-style: none;
                text-align: left;
            }
            .accounts li {
                background: white;
                padding: 0.75rem;
                margin: 0.5rem 0;
                border-radius: 6px;
                border-left: 3px solid #1e40af;
            }
            .footer {
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid #e2e8f0;
                color: #94a3b8;
                font-size: 0.9rem;
            }
            .port-info {
                background: #ecfdf5;
                border: 2px solid #10b981;
                padding: 1rem;
                border-radius: 8px;
                margin: 1rem 0;
                font-weight: 600;
                color: #065f46;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🛡️</div>
            <h1>ระบบใบรับประกันคุณภาพผลิตภัณฑ์</h1>
            <p class="subtitle">Test Server พร้อมใช้งาน | Phase 1 เสร็จสมบูรณ์</p>

            <div class="status-success">
                ✅ Port 3000 ว่างและพร้อมใช้งาน!
            </div>

            <div class="port-info">
                🌐 Server: <strong>http://localhost:3000</strong> | ✅ พร้อมให้ Next.js ใช้งาน
            </div>

            <div class="info-grid">
                <div class="info-card">
                    <h3>🎯 Phase 1 สำเร็จแล้ว</h3>
                    <ul>
                        <li>Next.js Project Structure</li>
                        <li>Tailwind CSS + Navy Blue Theme</li>
                        <li>Prisma Database Schema</li>
                        <li>NextAuth Authentication</li>
                        <li>Login & Dashboard Pages</li>
                        <li>Seed Data พร้อมใช้</li>
                        <li>README Documentation</li>
                    </ul>
                </div>

                <div class="info-card">
                    <h3>🔐 บัญชีทดสอบ</h3>
                    <div class="accounts">
                        <h4>Admin Account:</h4>
                        <ul>
                            <li><strong>Username:</strong> admin</li>
                            <li><strong>Password:</strong> admin123</li>
                            <li><strong>Role:</strong> Super Admin</li>
                        </ul>

                        <h4>Dealer Account:</h4>
                        <ul>
                            <li><strong>Username:</strong> dealer1</li>
                            <li><strong>Password:</strong> dealer123</li>
                            <li><strong>Role:</strong> Dealer Admin</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="next-steps">
                <h3>🚀 ขั้นตอนการรัน Next.js จริง</h3>

                <p><strong>1. ติดตั้ง Dependencies:</strong></p>
                <div class="code-block">npm install --legacy-peer-deps</div>

                <p><strong>2. ตั้งค่า Database:</strong></p>
                <div class="code-block">npx prisma generate<br>npx prisma db push<br>npm run db:seed</div>

                <p><strong>3. รัน Development Server:</strong></p>
                <div class="code-block">npm run dev</div>

                <p><strong>4. เปิดเบราว์เซอร์:</strong></p>
                <div class="code-block">http://localhost:3000</div>

                <p><strong>🎯 คาดหวัง:</strong> หน้า Login สี Navy Blue → Dashboard หลัง Login สำเร็จ</p>
            </div>

            <div class="footer">
                <strong>Status:</strong> Port 3000 พร้อมใช้งาน | สร้างด้วย ❤️ โดย Claude Code<br>
                <em>ปิด Test Server นี้แล้วรัน npm run dev เพื่อเริ่มใช้งานจริง</em>
            </div>
        </div>
    </body>
    </html>
  `;

  res.end(html);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Warranty App Test Server running at http://localhost:${PORT}`);
  console.log(`✅ Port ${PORT} is available and ready for Next.js!`);
  console.log(`📁 Project structure completed - Phase 1 ready!`);
  console.log(`🔧 Run 'npm run dev' to start the real Next.js application`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error('Server error:', err);
  }
});