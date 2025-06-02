// frontend/src/components/ReportGenerator.js
import React, { useState } from 'react';
import axios from 'axios';

function ReportGenerator({ token, hostnames }) {
  const [selectedHostname, setSelectedHostname] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');

  const handleGenerateReport = async () => {
    setMessage('Generating report...');
    try {
      const params = {
        hostname: selectedHostname,
        startDate: startDate || undefined, // Send only if selected
        endDate: endDate || undefined,    // Send only if selected
      };

      const response = await axios.get('${process.env.REACT_APP_BACKEND_URL}/api/reports/generate', {
        headers: { 'x-auth-token': token },
        params: params,
        responseType: 'blob', // Important for downloading files
      });

      // Create a Blob from the PDF data
      const file = new Blob([response.data], { type: 'application/pdf' });
      // Create a link element
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = `system_health_report_${selectedHostname}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL); // Clean up

      setMessage('Report generated successfully!');

    } catch (err) {
      console.error('Error generating report:', err);
      setMessage(err.response?.data?.msg || 'Failed to generate report. No data or server error.');
    }
  };

  return (
    <div style={{ padding: 20, border: '1px solid #eee', borderRadius: 8, marginTop: 40 }}>
      <h2>Generate Report</h2>
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 10 }}>Hostname:</label>
        <select value={selectedHostname} onChange={(e) => setSelectedHostname(e.target.value)} style={{ padding: 8, borderRadius: 5 }}>
          <option value="all">All Hosts</option>
          {hostnames.map(host => (
            <option key={host} value={host}>{host}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 10 }}>Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: 8, borderRadius: 5 }} />
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 10 }}>End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: 8, borderRadius: 5 }} />
      </div>
      <button onClick={handleGenerateReport} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
        Generate PDF Report
      </button>
      {message && <p style={{ marginTop: 10, color: message.includes('Success') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}

export default ReportGenerator;