import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";
import { replyToMessage } from "../llm";
import { replyAsDio, replyAsDioWithChatHistory } from "../personalities/dio";
@Discord()
export class Example {
  @On({
    "event" : "messageDelete"
  })
  messageDelete([message]: ArgsOf<"messageDelete">, client: Client): void {
    console.log("Message Deleted", client.user?.username, message.content);
  }

  @On({
    event : "messageCreate"
  })
  async messageCreate([message] : ArgsOf<"messageCreate">, client : Client){
    if (client.user !== null && message.author.id != client.user.id){
      const channel = message.channel
      await channel.sendTyping()
      
      // message.reply("Hello michael, how are you doing today")
      try{

        const response = await replyAsDioWithChatHistory(message.content)
        if (response !== ""){
          message.reply(response)
        }else{
          console.log("skippedd");
          
        }
      }
      catch(error: any ){
        if (error?.error?.code === "insufficient_quota"){
            message.reply("Sorry, I have run out of openai credits")
        }else{
            message.reply("Sorry, I have run out of openai credits")
            // console.error(error)
            
        }
    }
      
    }
    
  }
}
