import { GenerateContentResponse } from '@google/genai';
import axios from "axios";

const apikey = "md_gmnpxry_zm7cR0RlniPwz2DmcRAxwUk9Dbv-aBAZ3kJzJlrfMvo"
const baseUrl = "http://localhost:4040/api/v1"

const query = {
    contents: "What is NodeJS?",
}

async function sendRequest() {
    const res = await axios.post(`${baseUrl}/generate/text`, query, {
        headers: {
            "x-api-key": apikey
        },
        validateStatus: () => true
    })

    const account = res?.data?.data?.account
    const ai: GenerateContentResponse = res?.data?.data?.data

    console.log(account)
    console.log(ai)
}

await sendRequest();