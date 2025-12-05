const form = document.getElementById('form');
const outputElement = document.getElementById('output');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = new FormData(form);
    const inputText = formData.get('textarea');

    console.log('Input Text:', inputText);

    const data = await fetchApi(inputText);

    outputElement.textContent = data.anonymizedText;
});

async function fetchApi(inputText) {
    const res = await fetch("http://localhost:3000/anonymize", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: inputText,
        }),
    })
    const data = await res.json();
    return data;
}

