# **What is llongterm?**

Llongterm is a plug-and-play memory layer for AI developers. Imagine transforming static, one-off conversations into continuous, context-rich interactions that evolve over time. With llongterm, every conversation is augmented with a layer of memory, so users don’t have to repeat themselves, and your AI becomes truly aware of past interactions.

## **Overview**

Traditionally, user messages go directly to a large language model, which responds based solely on the current message. But what about all the context that came before? Llongterm changes the game by adding an intelligent memory step between the user and the LLM.

* **Step 1: Middleware Memory**: User messages are sent to llongterm first.  
* **Step 2: Memory Enrichment**: Llongterm remembers what the user said, finds related past interactions, and generates a “system message” containing all the relevant memories.  
* **Step 3: Augmented Messaging**: The enriched message, which includes the original user message and relevant context, is returned to you. You can then pass this enriched message to the LLM, allowing it to generate responses with greater context, ultimately improving the relevance and depth of each interaction.

The beauty of llongterm is that it seamlessly fits between your app and the LLM—just plug it in, and watch your user experience improve. No need to reinvent the wheel; llongterm leverages the system message feature to make sure every conversation is contextually aware.

## **Quick Start Guide**

Get up and running with llongterm in just a few minutes. Here’s how:

* **Get Your API Key**: Before using llongterm, you need to obtain an API key from [api.llongterm.com](https://api.llongterm.com/). You will also need your own OpenAI API key to enable LLM functionalities.\\  
* **Install the llongterm Package**: Install the package with a single command:  
* Copy  
* npm install llongterm  
* **Set Up Your First Mind**: With the SDK, you can create your own persistent “mind” that remembers your users' interactions.

import Llongterm from 'llongterm'

const llongterm \= new Llongterm({  
  keys: { llongterm: LLONGTERM\_KEY, openai: OPENAI\_API\_KEY },  
});

const mind \= await llongterm.create({  
  specialism: "Software Engineering"  
})

* 

const mind \= await llongterm.create({

* 

 specialism: "Software Engineering"

*   
* })  
*   
* 

**Store Information with "Remember"**: Once you have a mind set up, you can start adding messages from your users before .

* Copy

const chatHistory \= \[

* 

 {

* 

   author: "assistant",

* 

   message: "Hi there\! How can I help with your software engineering needs?"

* 

 },

* 

 {

* 

   author: "user",

* 

   message: "I'm struggling with CORS errors right now. "

* 

 }

* 

\]

* 

// Remember a piece of information and enrich it with memory

* 

const enrichedMessage \= await mind.remember({thread: chatHistory});

* 

*   
* // Ready to send to LLM

By adding llongterm to your conversational AI stack, your app gains the power of memory, turning static responses into dynamic, context-aware conversations.

## **Why Llongterm?**

* **Plug-and-Play Integration**: Drop llongterm into your existing app and immediately enhance the conversational flow without massive changes.  
* **Persistent Memory**: Empower your users by remembering key details between conversations—just like a human would.  
* **Clever Hacking of System Memory**: Llongterm uses a creative approach to augment LLMs, leveraging the system message field to inject relevant memory and make the AI more helpful and personalized.

Llongterm is built to help you create smarter, more engaging conversational AI. Give it a try and transform how your users interact with your app.  
---

Ready to get started? Follow the quick start above, or dive deeper into the [REST API](https://github.com/LLM-e/llongterm/blob/main/api/docs/broken-reference/README.md) or [JavaScript](https://docs.llongterm.com/docs/javascript) Documentation for detailed usage examples and API references.

# **Core Concepts**

Llongterm is built around three core concepts: Minds, Memory, and Middleware. Together, they provide a persistent and contextually rich experience for your AI, allowing it to remember, structure, and augment conversations intelligently.

### **Minds**

A "Mind" in llongterm is a persistent entity that is capable of taking user information and storing it as "memory." Minds are the central data holders that evolve based on user inputs, allowing you to build consistent and intelligent conversational experiences.

* **Accept Information**: Minds can accept pieces of information users provide, such as preferences, opinions, or ongoing discussions.  
* **Structure Memory**: Once information is received, the mind structures it into memory—a compact and meaningful representation that can be reused in future interactions.

With each user, a distinct Mind is created, enabling personalized experiences and creating the basis for long-term interaction consistency.

### **Memory**

Memory is the core data structure within llongterm. It is where all user-provided information is stored, compactly organized to provide efficient access to relevant data.

* **Compact Storage**: Memory in llongterm is designed to store all relevant user details in a streamlined format, allowing quick and easy retrieval of necessary information.  
* **Rich Representation**: By structuring incoming data into a unified memory model, llongterm makes it possible for the AI to recall both granular details and broader context.  
* **Persistent Context**: Memory allows long-term context to persist across different sessions, enabling the AI to hold coherent, ongoing conversations with users, rather than starting from scratch each time.

To see examples of stored memory see  specification.

### **Llongterm as Middleware**

Llongterm also acts as a middleware layer between the user and your LLM (Large Language Model). When information is remembered, llongterm augments this memory and returns an enriched system message.

* **Augmentation of Memory**: Each time new information is remembered, llongterm enriches the memory context by associating it with past interactions and insights. This enriched memory is then used to augment ongoing interactions.  
* **Returning Enriched Context**: When you call the remember function, llongterm not only stores the new data but also generates a system message. This message contains all relevant context extracted from memory, ready to be used in subsequent LLM queries.  
* **Seamless Integration**: The system message is passed back to the developer, who can then forward it to the LLM. This middleware approach ensures that the LLM receives all the context it needs to generate informed responses, leading to richer and more coherent user interactions.

### **Human Readable**

Llongterm's memory structure is designed to be human readable, enhancing user trust and interaction with the system.

* **Ease of Understanding**: The data format is intuitive, ensuring that both developers and users can easily interpret stored information.  
* **Clear Debugging**: With a transparent memory view, developers can quickly identify issues and understand the memory's impact on interactions.  
* **Improved Transparency**: Users gain insights into how their data is used, fostering a sense of transparency and control over their information.  
* **User-Friendly Documentation**: The human-readable format facilitates easier documentation, sharing, and collaboration among teams.

# **Use Cases**

Llongterm’s capabilities shine in various scenarios where persistent memory and context-aware interactions elevate the user experience. Below are some key use cases where llongterm can make a substantial impact.

Contact us at team@llongterm.com to discuss your use case.

### **AI Agents in Teaching**

Imagine an AI teaching assistant that not only answers student questions but remembers individual student progress, preferences, and past challenges. With llongterm, the teaching assistant can:

* **Track Learning Progress**: Remember each student’s strengths and areas of difficulty, tailoring future lessons and practice questions accordingly.  
* **Personalize Feedback**: Provide contextually aware feedback based on a student’s history, such as referencing previous lessons or challenges they faced.  
* **Support Long-Term Projects**: Help students on long-term projects by recalling details across multiple sessions, ensuring continuity and supporting more in-depth understanding over time.

### **AI Agents in Customer Support**

In customer support, continuity is key. Llongterm allows customer support bots to remember past interactions, creating a personalized experience for each user.

* **Persistent Support**: Remember the details of previous customer inquiries, so users don’t have to repeat their issues every time they engage with the support system.  
* **Proactive Solutions**: Suggest solutions based on the history of interactions. If a customer had a recurring issue, the AI can recognize patterns and proactively offer resolutions.  
* **Enhanced Satisfaction**: Provide consistent, personalized service that remembers each user’s history, increasing satisfaction and reducing frustration.

### **AI Agents in Therapy**

AI therapy applications benefit greatly from the ability to retain the context of past conversations. Llongterm helps provide a supportive, consistent therapeutic experience.

* **Contextual Understanding**: Remember client stories, milestones, and progress, which allows the AI to provide more contextually aware responses and support.  
* **Emotional Continuity**: Maintain a connection between sessions by recalling the emotions and topics discussed, which is crucial for effective therapeutic support.  
* **Goal Tracking**: Help clients track their progress towards therapy goals by recalling discussions and reminding them of positive strides or recurring challenges.

### **AI Agents in Product Management**

Product managers often need to keep track of multiple data points, ongoing projects, and evolving requirements. Llongterm enables an AI product manager to stay on top of all these details.

* **Track Requirements**: Remember product requirements across different phases, ensuring the team doesn't lose track of any critical details.  
* **Meeting Context**: Recall the context of past meetings, including decisions made and actions taken, to help in ongoing project management.  
* **Stakeholder Management**: Keep track of stakeholder preferences and past feedback, allowing the AI to assist in making informed decisions and maintaining alignment across the team.

### **AI Agents in Sales**

In sales, personalization and follow-up are crucial. Llongterm helps AI sales assistants keep track of leads, conversations, and preferences, ultimately helping to close more deals.

* **Lead Tracking**: Remember details from conversations with leads, such as their business needs and pain points, allowing the AI to follow up with personalized, relevant messages.  
* **Customer Journey Awareness**: Keep track of where leads are in the sales funnel, enabling the AI to provide the most appropriate next steps and information.  
* **Relationship Building**: Foster stronger client relationships by recalling past interactions, ensuring every touchpoint is informed by the complete history of the conversation.

# **Javascript / Node.js**

## **Getting Started**

To install llongterm, use npm or yarn:  
Copy  
npm install llongterm

or  
Copy  
yarn add llongterm

After installation, ensure you setup your `.env` file to house your credentials privately.  
Copy  
OPENAI\_KEY=abcdefg...

LLONGTERM\_KEY=hijklmnop

Then we can initialise Llongterm. Either with `import` or `require`  
Copy  
import Llongterm from 'llongterm'

//or 

const Llongterm \= require('llongterm').default  
Copy  
// after importing Llongterrm

const llongterm \= new Llongterm({

 username: "Dom",

 keys: { llongterm: process.env.LLONGTERM\_KEY, openai: process.env.OPENAI\_API\_KEY },

});

To get all you can out of Llongterm, you'll need to create a mind that can store memory. That's next\!

# **llongterm.create**

Creating a new mind can be tricky \- just ask Frankenstein\! However, we've tried to make the process as painless as possible. First lets create a mind for our user who's specialism is 'Financial Advisor'.  
Copy

const specialistMind \= await llongterm.create({ 

 specialism: "Financial Advisor", 

 specialismDepth: 2,

})

This returns an autogenerated memory structure that is empty, alongside the metadata of the mind.  
Copy  
memory:{

 summary: Empty mind

 unstructured: {}

 structured: {

   Investment Strategies: {

     summary: Investment strategies section

     unstructured: {}

     structured: {

       Equity Investment : ...

       Fixed Income Investment Strategies ...

       ...

     }

   },

   Retirement Planning: {

   ....

 }

}}

As information is fed in, the relevant subsections are found and filled in based on the users input.

It's also possible to enforce custom structured keys into the memory structure:

const customisedMind \= await llongterm.create({ customStructuredKeys: \["Coding Languages", "Best Practices", "Testing"\], });  
Copy  
 "memory": {

   "summary": "Empty mind",

   "unstructured": {},

   "structured": {

     "Coding Languages": {

       "summary": "Empty section",

       "unstructured": {},

       "structured": {}

     },

     "Best Practices": {

       "summary": "Empty section",

       "unstructured": {},

       "structured": {}

     },

     "Testing": {

       "summary": "Empty section",

       "unstructured": {},

       "structured": {}

     }

   }

 },  
Copy

\<div data-gb-custom-block data-tag="hint" data-style='info'\>

\<div data-gb-custom-block data-tag="code" data-fullWidth='true'\>

### **Arguments**

Argument  
Type  
Required  
Description  
specialism  
string  
No\*  
Defines the mind's area of expertise (e.g., "Financial Advisor", "Software Engineer"). Cannot be used with `customStructuredKeys`.  
specialismDepth  
number  
No  
Controls the granularity of the specialist mind's memory structure. Higher numbers create more detailed categorization. Default is 1\. Only applicable when using `specialism`.  
customStructuredKeys  
string\[\]  
No\*  
Array of custom memory categories for organizing the mind's knowledge (e.g., \["Coding Languages", "Best Practices"\]). Cannot be used with `specialism`.

\* Either `specialism` OR `customStructuredKeys` must be provided, but not both.

#### **Response**

Property  
Type  
Description  
mind  
\<Mind\>  
Llongterm Mind object  
Copy

\</div\>

\</div\>

# **llongterm.get**

Fetch the mind you need  
Copy  
const mind \= await llongterm.get('your.mind.id')

console.log('Mind fetched:', mind);

#### **Arguments**

Parameter  
Type  
Description  
id  
string  
The id of the mind to fetch

#### **Response**

Property  
Type  
Description  
mind  
\<Mind\>  
Llongterm Mind object

# **mind.remember**

To store information in the mind, use the `remember` method. This allows the Mind to persist knowledge and generate a system message that can be passed to the LLM.  
Copy  
const response \= await mind.remember(\[

 {

   "author": "user",

   "message": "I want to learn Python and JavaScript"

 },

 {

   "author": "assistant",

   "message": "I understand you want to learn more programming languages"

 }

\]);

#### **Arguments**

Parameter  
Type  
Description  
messages  
Array\<{author: string, message: string}\>  
Array of message objects containing the conversation history to remember. Each message must have an `author` and `message` field.

#### **Response**

Property  
Type  
Description  
metadata  
object  
Configuration and identifying information about a mind (see metadata structure below).  
systemMessage  
string  
A generated message that provides context and relevant knowledge for the mind's responses.

#### **Metadata Structure**

Property  
Type  
Description  
relatedKnowledge  
string  
Contains any related knowledge found in the mind's memory.  
rawMessage  
string  
The original message in JSON format containing author and message.  
messageWithContext  
string\[\]  
Array of messages with additional context added.  
updateValues  
string\[\]  
Paths in the mind's memory structure where this information was stored (e.g., "/unstructured", "structured/Coding Languages/unstructured").  
changes  
object  
Object containing any changes made to the mind's memory structure.  
Copy  
// Example metadata response

{

 "metadata": {

   "relatedKnowledge": "",

   "rawMessage": "{\\"author\\":\\"assistant\\",\\"message\\":\\"A function is a block of code designed to perform a particular task. A class is a blueprint for creating objects.\\"}",

   "messageWithContext": \[

     "A function is a block of code designed to perform a particular task, while a class is a blueprint for creating objects."

   \],

   "updateValues": \[

     "/unstructured",

     "structured/Coding Languages/unstructured"

   \],

   "changes": {}

 }

}

# **mind.ask**

You can use the `ask` method to enrich user queries with context pulled from the mind's memory.  
Copy

const { knowledge } \= await mind.ask('How does the user feel about apples?');

console.log("Extracted knowledge: ", response);  
Parameter  
Type  
Description  
question  
string  
The user's question to ask the mind

**Response**  
Property  
Type  
Description  
knowledge  
string  
The answer generated by the LLM, enriched with memory

# **mind.kill**

If a mind is no longer needed, you can delete it using the `kill` method.  
Copy  
const { success } \= await mind.kill();

console.log('Mind deleted');

**Arguments**  
Parameter  
Type  
Description  
id  
string  
The id of the mind to fetch

**Response**  
Property  
Type  
Description  
success  
boolean  
Indicates if the mind was successfully deleted  
