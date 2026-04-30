function handleCall() {
    currentTokenNumber++;
    document.getElementById('generatedToken').innerText = currentTokenNumber;

    const callTime = new Date().toLocaleTimeString();
    document.getElementById('callTime').value = new Date().toISOString();
    document.getElementById('callTimeDisplay').innerText = callTime;

    acknowledgmentStatus = false;

    document.getElementById('acknowledge-button').disabled = false;
    document.getElementById('end-button').disabled = false;
    document.getElementById('acknowledge-button').classList.add('blink');
    document.getElementById('end-button').classList.add('blink');

    let progressBar = document.getElementById('progressBar');
    progressBar.style.width = '0%';
    let progress = 0;
    let interval = setInterval(() => {
        progress += 20;
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            document.getElementById('acknowledge-button').disabled = true; 
        }
    }, 1000);
}
