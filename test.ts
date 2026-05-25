import { OpenAI } from "openai";

const ai = new OpenAI({
    baseURL: "https://hotaru.masdepan.my.id/v1",
    apiKey: "freellmapi-56b7762c7413afa994d465478542a2237759e635f0997bd3"
});

async function main() {
    const response = await ai.chat.completions.create({
        model: "auto",
        messages: [
            {
                role: "user",
                content: "What is the capital of France?",
            },
        ],
    });

    console.log(response.choices[0].message.content);
    console.log(response);
}

main();