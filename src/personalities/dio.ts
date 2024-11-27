import "cheerio"
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio"
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { createStuffDocumentsChain } from "langchain/chains/combine_documents"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { createRetrievalChain } from "langchain/chains/retrieval"
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages"

// Load Dio's information, hopefully to derive insights in his personality from the webpage
const loader = new CheerioWebBaseLoader("https://jojo.fandom.com/wiki/Dio_Brando")
const docs = await loader.load()
const embeddings = new OpenAIEmbeddings()
const text_splitter = new RecursiveCharacterTextSplitter()
const splits = await text_splitter.splitDocuments(docs)
const vector_store = await MemoryVectorStore.fromDocuments(splits, embeddings)

const retriever = vector_store.asRetriever()
const ai_prompt = "You are act as a regular human being. Use the following pieces of retrieved context to respond to other individual as though you were the average joe . If you do not believe that you are the subject of the human input, respond with an empty string. Use two sentences maximum and keep the answer concise."+
"Context: {context}" 

const prompt = ChatPromptTemplate.fromMessages([
    ["ai", ai_prompt],
    ["human", "{input}"]
])
const llm = new ChatOpenAI({
    "model" : "gpt-4o-mini", temperature : 1.5
})

const response_chain = await createStuffDocumentsChain({
    llm, 
    prompt,

} )

const rag = await createRetrievalChain({
    retriever, combineDocsChain : response_chain 
}, )


const contextualizeQSystemPrompt =
  "Given a chat history and the latest user question " +
  "which might reference context in the chat history, " +
  "formulate a standalone question which can be understood " +
  "without the chat history. Do NOT answer the question, " +
  "just reformulate it if needed and otherwise return it as is.";

const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
  ["system", contextualizeQSystemPrompt],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

const historyAwareRetriever = await createHistoryAwareRetriever({
  llm,
  retriever,
  rephrasePrompt: contextualizeQPrompt,
});

const qaPrompt = ChatPromptTemplate.fromMessages([
    ["system", ai_prompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);
  
  const questionAnswerChain2 = await createStuffDocumentsChain({
    llm,
    prompt: qaPrompt,
  });
  
  const ragChain2 = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: questionAnswerChain2,
  });

let chat_history : BaseMessage[] = []

export async function replyAsDio(input : string){
    const response =  (await rag.invoke({input})).answer
    return response
}
export async function replyAsDioWithChatHistory(input : string){
    const response = (await ragChain2.invoke({input, chat_history})).answer
    chat_history = chat_history.concat([new HumanMessage(input), new AIMessage(response)])
    return response
}