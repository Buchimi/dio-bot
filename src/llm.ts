import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { pull } from "langchain/hub";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export const llm = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0
});

const embeddings = new OpenAIEmbeddings()

const vectorStore = new MemoryVectorStore(embeddings)
const retriever = vectorStore.asRetriever()
const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt")

const ragchain = await createStuffDocumentsChain({
    llm,
    prompt,
    outputParser : new StringOutputParser()
})

export async function replyToMessage(message : string){
    const retrievedDocs = await retriever.invoke(message)


        return await ragchain.invoke({
            question : message,
            context : retrievedDocs
        })
    
}
