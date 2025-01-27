document.addEventListener('DOMContentLoaded', function() {
    // Загрузка сохраненного фона и инициализация
    loadBackground();
    initializeScanner();

    // Обработчик кнопки настроек
    document.getElementById('settingsToggle').addEventListener('click', function() {
        document.getElementById('settingsPanel').classList.toggle('active');
    });

    // Обработчик изменения фона
    document.getElementById('backgroundInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const backgroundImage = e.target.result;
                document.body.style.backgroundImage = `url(${backgroundImage})`;
                chrome.storage.local.set({ 'background': backgroundImage });
            };
            reader.readAsDataURL(file);
        }
    });

    // Обработчик удаления фона
    document.getElementById('removeBackground').addEventListener('click', function() {
        document.body.style.backgroundImage = 'none';
        chrome.storage.local.remove('background');
    });
});

function loadBackground() {
    chrome.storage.local.get('background', function(data) {
        if (data.background) {
            document.body.style.backgroundImage = `url(${data.background})`;
        }
    });
}

function initializeScanner() {
    const scanButton = document.getElementById('scanButton');
    const ipInput = document.getElementById('ipInput');
    const resultContainer = document.getElementById('resultContainer');

    // Получаем текущий URL при загрузке
    getCurrentTabUrl();

    // Обработчик кнопки сканирования
    scanButton.addEventListener('click', () => performScan());

    // Функция получения текущего URL
    function getCurrentTabUrl() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]?.url) {
                const url = new URL(tabs[0].url);
                ipInput.value = url.hostname;
            }
        });
    }

    // Функция выполнения сканирования
    async function performScan() {
        const target = ipInput.value.trim();
        if (!target) {
            showResult('Пожалуйста, введите IP адрес или домен', 'error');
            return;
        }

        showResult('Сканирование...', 'loading');
        scanButton.disabled = true;

        try {
            // Получаем информацию о хосте
            const hostInfo = await scanHost(target);
            // Получаем информацию о портах
            const portScan = await scanPorts(target);
            // Получаем DNS информацию
            const dnsInfo = await getDnsInfo(target);

            // Формируем и отображаем результат
            const resultHtml = formatResults(hostInfo, portScan, dnsInfo);
            showResult(resultHtml, 'success');
        } catch (error) {
            showResult(`Ошибка сканирования: ${error.message}`, 'error');
        } finally {
            scanButton.disabled = false;
        }
    }

    // Функция сканирования хоста
    async function scanHost(target) {
        const response = await fetch(`https://api.hackertarget.com/hostsearch/?q=${target}`);
        if (!response.ok) throw new Error('Ошибка получения информации о хосте');
        return await response.text();
    }

    // Функция сканирования портов
    async function scanPorts(target) {
        const response = await fetch(`https://api.hackertarget.com/nmap/?q=${target}`);
        if (!response.ok) throw new Error('Ошибка сканирования портов');
        return await response.text();
    }

    // Функция получения DNS информации
    async function getDnsInfo(target) {
        const response = await fetch(`https://api.hackertarget.com/dnslookup/?q=${target}`);
        if (!response.ok) throw new Error('Ошибка получения DNS информации');
        return await response.text();
    }

    // Функция форматирования результатов
    function formatResults(hostInfo, portScan, dnsInfo) {
        return `
            <div class="scan-results">
                <div class="result-section">
                    <h3>Информация о хосте:</h3>
                    <pre>${formatHostInfo(hostInfo)}</pre>
                </div>
                
                <div class="result-section">
                    <h3>Открытые порты:</h3>
                    <pre>${formatPortScan(portScan)}</pre>
                </div>
                
                <div class="result-section">
                    <h3>DNS информация:</h3>
                    <pre>${formatDnsInfo(dnsInfo)}</pre>
                </div>
            </div>
        `;
    }

    // Вспомогательные функции форматирования
    function formatHostInfo(info) {
        return info.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [host, ip] = line.split(',');
                return `Хост: ${host}\nIP: ${ip}`;
            })
            .join('\n\n');
    }

    function formatPortScan(scan) {
        return scan.split('\n')
            .filter(line => line.trim())
            .join('\n');
    }

    function formatDnsInfo(info) {
        return info.split('\n')
            .filter(line => line.trim())
            .join('\n');
    }

    // Функция отображения результата
    function showResult(content, type) {
        resultContainer.innerHTML = '';
        
        if (type === 'loading') {
            resultContainer.innerHTML = `
                <div class="loading">
                    <p>Сканирование...</p>
                    <div class="spinner"></div>
                </div>
            `;
        } else if (type === 'error') {
            resultContainer.innerHTML = `
                <div class="error-message">
                    ${content}
                </div>
            `;
        } else {
            resultContainer.innerHTML = content;
        }
    }
}