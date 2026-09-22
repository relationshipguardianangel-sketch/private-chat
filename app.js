let peerConnection = null;
let dataChannel = null;

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const statusElement = document.getElementById("status");
const setup = document.getElementById("setup");
const chat = document.getElementById("chat");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const connectBtn = document.getElementById("connectBtn");
const offerSection = document.getElementById("offerSection");
const answerSection = document.getElementById("answerSection");
const offerCode = document.getElementById("offerCode");
const offerInput = document.getElementById("offerInput");
const answerInput = document.getElementById("answerInput");
const answerCode = document.getElementById("answerCode");
const copyOfferBtn = document.getElementById("copyOfferBtn");
const copyAnswerBtn = document.getElementById("copyAnswerBtn");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

function setStatus(text, connected = false) {
    statusElement.textContent = text;
    statusElement.className = connected
        ? "status connected"
        : "status disconnected";
}

function showMessage(text, mine = false) {
    const div = document.createElement("div");
    div.className = mine ? "message mine" : "message theirs";
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function showSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "system";
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onconnectionstatechange = () => {
        console.log("Connection:", peerConnection.connectionState);

        if (peerConnection.connectionState === "connected") {
            setStatus("Connected", true);
            setup.classList.add("hidden");
            chat.classList.remove("hidden");
            showSystemMessage("Secure peer-to-peer connection established.");
        }

        if (peerConnection.connectionState === "disconnected") {
            setStatus("Disconnected");
        }

        if (peerConnection.connectionState === "failed") {
            setStatus("Connection failed");
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE:", peerConnection.iceConnectionState);
    };

    return peerConnection;
}

createBtn.addEventListener("click", async () => {
    createBtn.disabled = true;
    createPeerConnection();

    dataChannel = peerConnection.createDataChannel("chat");
    setupDataChannel(dataChannel);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGathering();

    const code = {
        type: peerConnection.localDescription.type,
        sdp: peerConnection.localDescription.sdp
    };

    offerCode.value = btoa(JSON.stringify(code));
    offerSection.classList.remove("hidden");
});

joinBtn.addEventListener("click", async () => {
    const encoded = offerInput.value.trim();

    if (!encoded) {
        alert("Paste the connection code first.");
        return;
    }

    try {
        const code = JSON.parse(atob(encoded));
        createPeerConnection();

        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannel(dataChannel);
        };

        await peerConnection.setRemoteDescription(code);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await waitForIceGathering();

        const response = {
            type: peerConnection.localDescription.type,
            sdp: peerConnection.localDescription.sdp
        };

        answerCode.value = btoa(JSON.stringify(response));
        answerSection.classList.remove("hidden");
    } catch (error) {
        console.error(error);
        alert("Invalid connection code.");
    }
});

connectBtn.addEventListener("click", async () => {
    const encoded = answerInput.value.trim();

    if (!encoded) {
        alert("Paste the response first.");
        return;
    }

    try {
        const answer = JSON.parse(atob(encoded));
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error(error);
        alert("Invalid response code.");
    }
});

function setupDataChannel(channel) {
    channel.onopen = () => {
        setStatus("Connected", true);
        setup.classList.add("hidden");
        chat.classList.remove("hidden");
        showSystemMessage("Secure peer-to-peer connection established.");
    };

    channel.onclose = () => setStatus("Disconnected");

    channel.onerror = error => {
        console.error("Data channel error:", error);
    };

    channel.onmessage = event => showMessage(event.data, false);
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    if (!dataChannel || dataChannel.readyState !== "open") {
        alert("Chat is not connected.");
        return;
    }

    dataChannel.send(message);
    showMessage(message, true);
    messageInput.value = "";
    messageInput.focus();
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter") sendMessage();
});

copyOfferBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(offerCode.value);
    copyOfferBtn.textContent = "Copied!";
    setTimeout(() => copyOfferBtn.textContent = "Copy Code", 1500);
});

copyAnswerBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(answerCode.value);
    copyAnswerBtn.textContent = "Copied!";
    setTimeout(() => copyAnswerBtn.textContent = "Copy Response", 1500);
});

function waitForIceGathering() {
    return new Promise(resolve => {
        if (peerConnection.iceGatheringState === "complete") {
            resolve();
            return;
        }

        const checkState = () => {
            if (peerConnection.iceGatheringState === "complete") {
                peerConnection.removeEventListener(
                    "icegatheringstatechange",
                    checkState
                );
                resolve();
            }
        };

        peerConnection.addEventListener(
            "icegatheringstatechange",
            checkState
        );

        setTimeout(resolve, 5000);
    });
}
