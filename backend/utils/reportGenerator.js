// backend/utils/reportGenerator.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs/promises'); // For async file operations

async function generateReport(metrics, hostname, startDate, endDate) {
    // Prepare data for the report template
    const reportDate = new Date().toLocaleDateString();
    const startStr = new Date(startDate).toLocaleDateString();
    const endStr = new Date(endDate).toLocaleDateString();

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>System Health Report - ${hostname || 'All Hosts'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { margin-bottom: 20px; border: 1px solid #eee; padding: 15px; background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <h1>System Health Report</h1>
            <div class="summary">
                <p><strong>Report Date:</strong> ${reportDate}</p>
                <p><strong>Hostname:</strong> ${hostname || 'All Monitored Hosts'}</p>
                <p><strong>Period:</strong> ${startStr} - ${endStr}</p>
            </div>

            <h2>Metrics Overview</h2>
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Hostname</th>
                        <th>CPU (%)</th>
                        <th>Memory (%)</th>
                        <th>Disk (%)</th>
                        <th>Uptime (s)</th>
                        <th>OS</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.map(metric => `
                        <tr>
                            <td>${new Date(metric.timestamp).toLocaleString()}</td>
                            <td>${metric.hostname}</td>
                            <td>${metric.cpu.toFixed(2)}</td>
                            <td>${metric.memory.toFixed(2)}</td>
                            <td>${metric.disk.toFixed(2)}</td>
                            <td>${metric.uptime}</td>
                            <td>${metric.os}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for Docker environments
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();
    return pdfBuffer;
}

module.exports = { generateReport };