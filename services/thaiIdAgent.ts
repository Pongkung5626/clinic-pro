
export class ThaiIdAgent {
  async readThaiId(agentUrl: string): Promise<any> {
    if (!agentUrl) {
      throw new Error('ยังไม่ได้ตั้งค่า Smart Card Agent URL ในหน้าตั้งค่า');
    }

    const urlsToTry = [agentUrl];
    // If agentUrl uses localhost, add 127.0.0.1 as a fallback
    if (agentUrl.includes('localhost')) {
      urlsToTry.push(agentUrl.replace('localhost', '127.0.0.1'));
    }

    let lastError: any = null;

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout per attempt
        });

        if (!response.ok) {
          throw new Error(`Agent error: ${response.statusText}`);
        }

        const data = await response.json();
        let rawData = data.data || data;
        if (Array.isArray(rawData) && rawData.length > 0) {
          rawData = rawData[0];
        }
        console.log('Thai ID Agent Raw Data:', rawData);
        
        // Mapping logic (adjust based on common agent outputs)
        const idCard = rawData.CitizenID || rawData.PID || rawData.idCard || rawData.cid || rawData.id || '';
        
        let firstName = '';
        let lastName = '';
        
        if (rawData.ThaiName) {
          const parts = rawData.ThaiName.split(' ').filter(Boolean);
          if (parts.length >= 3) {
            firstName = parts[1];
            lastName = parts[parts.length - 1];
          } else if (parts.length === 2) {
            firstName = parts[0];
            lastName = parts[1];
          }
        } else {
          firstName = rawData.firstName || rawData.FName || rawData.name || '';
          lastName = rawData.lastName || rawData.LName || rawData.surname || '';
        }

        let birthDate = '';
        const rawBirthDate = rawData.BirthDate || rawData.birthDate || rawData.birthday || '';
        if (rawBirthDate && rawBirthDate.length === 8 && !rawBirthDate.includes('-')) {
          // Format YYYYMMDD (Buddhist Era or Christian Era)
          let year = parseInt(rawBirthDate.substring(0, 4));
          if (year > 2400) year -= 543; // Convert BE to CE
          const month = rawBirthDate.substring(4, 6);
          const day = rawBirthDate.substring(6, 8);
          birthDate = `${year}-${month}-${day}`;
        } else if (rawBirthDate) {
          birthDate = rawBirthDate;
        }

        const genderVal = rawData.Gender || rawData.gender || rawData.Sex || rawData.sex || '';
        const gender = (genderVal === '1' || genderVal === 'M' || genderVal === 'Male' || genderVal === 'ชาย') ? 'M' : 'F';
        const address = rawData.Address || rawData.address || rawData.Addr || rawData.addr || '';

        return {
          idCard,
          firstName,
          lastName,
          birthDate,
          gender,
          address
        };
      } catch (e: any) {
        lastError = e;
        // If it's a network error (Failed to fetch), try the next URL
        if (e.message === 'Failed to fetch' || e.name === 'TypeError') continue;
        // Otherwise break and throw
        break;
      }
    }

    // If we reach here, all attempts failed
    const e = lastError;
    console.error('Thai ID Agent Read Error Detail:', {
      error: e,
      url: agentUrl,
      protocol: window.location.protocol
    });
    
    if (e.name === 'AbortError' || e.name === 'TimeoutError') {
      throw new Error('การเชื่อมต่อกับ Agent หมดเวลา (Timeout): โปรดตรวจสอบว่าโปรแกรม Agent กำลังทำงานอยู่และไม่ได้ถูก Firewall บล็อก');
    }

    const isHttps = window.location.protocol === 'https:';
    const isHttpAgent = agentUrl.startsWith('http:');
    
    // Specific check for Mixed Content (Failed to fetch on HTTPS site calling HTTP API)
    if (isHttps && isHttpAgent && (e.message === 'Failed to fetch' || e.name === 'TypeError')) {
      const error = new Error('ตรวจพบปัญหา Mixed Content: เบราว์เซอร์บล็อกการเชื่อมต่อ HTTP จากหน้าเว็บ HTTPS');
      (error as any).code = 'MIXED_CONTENT';
      throw error;
    }

    throw new Error(`ไม่สามารถเชื่อมต่อกับเครื่องอ่านบัตรได้: ${e.message || 'โปรดตรวจสอบว่าโปรแกรม Agent กำลังทำงานอยู่ และตั้งค่า URL ถูกต้อง'}`);
  }
}
