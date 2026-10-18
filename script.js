(function () {
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const errorMsg = document.getElementById('errorMsg');
  const qrCanvas = document.getElementById('qrCanvas');
  const qrDownloadBtn = document.getElementById('qrDownloadBtn');
  const qrUrlPreview = document.getElementById('qrUrlPreview');
  const logoLink = document.getElementById('logoLink');
  const toast = document.getElementById('toast');

  let currentUrl = '';
  let toastTimer = null;

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add('visible');
  }

  function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  function normalizeUrl(rawValue) {
    const trimmed = rawValue.trim();
    if (!trimmed) return '';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
      return trimmed;
    }
    return 'https://' + trimmed;
  }

  /**
   * 캔버스에 고해상도 QR코드를 그리며, JPG 저장 시 배경이 검게 변하지 않도록
   * 흰색(#FFFFFF) 배경을 먼저 채운 뒤 모듈을 렌더링합니다.
   */
  function renderQrToCanvas(text) {
    const size = 600; // 고해상도 JPG 다운로드를 위한 내부 픽셀 크기
    qrCanvas.width = size;
    qrCanvas.height = size;
    const ctx = qrCanvas.getContext('2d');

    // 1. 순백색 배경 채우기 (JPG 변환 시 필수)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    if (typeof window.qrcode === 'function') {
      // typeNumber 0 = 자동 감지, 오류 복원 수준 'M'
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();

      const moduleCount = qr.getModuleCount();
      const marginModules = 2; // 여백(Quiet Zone)
      const totalModules = moduleCount + marginModules * 2;
      const cellSize = size / totalModules;

      ctx.fillStyle = '#0F172A';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            const x = Math.floor((col + marginModules) * cellSize);
            const y = Math.floor((row + marginModules) * cellSize);
            const w = Math.ceil((col + marginModules + 1) * cellSize) - x;
            const h = Math.ceil((row + marginModules + 1) * cellSize) - y;
            ctx.fillRect(x, y, w, h);
          }
        }
      }
    } else {
      // 외부 CDN 연결이 안 된 오프라인 환경일 경우 이미지 API 폴백
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 24, 24, size - 48, size - 48);
      };
      img.src =
        'https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=' +
        encodeURIComponent(text);
    }
  }

  // URL 입력 후 확인(제출) 이벤트
  urlForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    const raw = urlInput.value;
    const formattedUrl = normalizeUrl(raw);

    if (!formattedUrl) {
      showError('변환할 URL 주소를 입력해 주세요.');
      urlInput.focus();
      return;
    }

    try {
      const parsed = new URL(formattedUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        showError('올바른 URL 형식을 입력해 주세요. (예: https://example.com)');
        urlInput.focus();
        return;
      }
    } catch (_) {
      showError('올바른 URL 형식을 입력해 주세요. (예: https://example.com)');
      urlInput.focus();
      return;
    }

    currentUrl = formattedUrl;
    urlInput.value = formattedUrl;

    // QR코드 생성
    renderQrToCanvas(currentUrl);
    qrUrlPreview.textContent = currentUrl;

    // 입력창을 하단으로 내리고 정중앙에 QR코드 표시
    document.body.classList.add('has-qr');
    urlInput.blur();
  });

  urlInput.addEventListener('input', function () {
    if (errorMsg.classList.contains('visible')) {
      clearError();
    }
  });

  // 4. QR코드 클릭 시 JPG 파일 다운로드
  qrDownloadBtn.addEventListener('click', function () {
    if (!currentUrl) return;

    const jpgDataUrl = qrCanvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');

    // 파일명 생성 (예: qrcode-example.com.jpg)
    let fileSuffix = 'image';
    try {
      const host = new URL(currentUrl).hostname.replace(/^www\./, '');
      if (host) fileSuffix = host.replace(/[^a-zA-Z0-9.-]/g, '_');
    } catch (_) {}

    link.href = jpgDataUrl;
    link.download = `qrcode-${fileSuffix}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('QR코드가 JPG 파일로 다운로드되었습니다!');
  });

  // 좌측 상단 로고 클릭 시 초기 화면(중앙 입력창)으로 복귀
  logoLink.addEventListener('click', function (e) {
    e.preventDefault();
    document.body.classList.remove('has-qr');
    clearError();
    urlInput.value = '';
    currentUrl = '';
    setTimeout(() => {
      urlInput.focus();
    }, 300);
  });
})();
