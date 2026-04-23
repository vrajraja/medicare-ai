import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {

const initialBotMessage = {
type:"bot",
text:`Hi 👋 I'm your Medical AI assistant.
You can:
• Ask symptoms
• Upload images
• Use voice mode 🎤

How can I help you today?`
};

/* ---------------- STATE ---------------- */

const [name,setName]=useState("");
const [email,setEmail]=useState("");
const [password,setPassword]=useState("");

const [storedUser,setStoredUser]=useState(null);

/* 🔥 PROFILE FEATURE */
const [showProfile,setShowProfile]=useState(false);
const [profile,setProfile]=useState({
weight:"",
height:"",
gender:"",
diseases:"",
medications:""
});

const [message,setMessage]=useState("");
const [messages,setMessages]=useState([initialBotMessage]);

const [loading,setLoading]=useState(false);
const [isStreaming,setIsStreaming]=useState(false);

const [darkMode,setDarkMode]=useState(false);
const [voiceMode,setVoiceMode]=useState(false);
const [isListening,setIsListening]=useState(false);

const [image,setImage]=useState(null);
const [preview,setPreview]=useState(null);

/* 🔥 NEW STATES */
const [chatTitle,setChatTitle]=useState("New Chat");
const [chatHistory,setChatHistory]=useState([]);
const [search,setSearch]=useState("");

const controllerRef=useRef(null);
const recognitionRef=useRef(null);
const silenceTimerRef=useRef(null);

const messagesEndRef=useRef(null);
const fileInputRef=useRef(null);

const saveProfile=()=>{
setShowProfile(false);
};

/* ---------------- SCROLL ---------------- */

const scrollToBottom=()=>{
messagesEndRef.current?.scrollIntoView({behavior:"smooth"});
};

useEffect(()=>{
scrollToBottom();
},[messages,loading]);

/* ---------------- LOAD USER ---------------- */

useEffect(()=>{
const savedUser=localStorage.getItem("userData");
if(savedUser) setStoredUser(JSON.parse(savedUser));

/* 🔥 LOAD CHAT HISTORY */
const savedChats = localStorage.getItem("chatHistory");
if(savedChats) setChatHistory(JSON.parse(savedChats));

const savedProfile = localStorage.getItem("profileData");
if(savedProfile) setProfile(JSON.parse(savedProfile));

},[]);

/* ---------------- SAVE CHAT HISTORY ---------------- */

useEffect(()=>{
localStorage.setItem("chatHistory",JSON.stringify(chatHistory));
},[chatHistory]);

/* 🔥 SAVE PROFILE */
useEffect(()=>{
localStorage.setItem("profileData",JSON.stringify(profile));
},[profile]);

/* ---------------- VOICE MODE ---------------- */

useEffect(()=>{
if(voiceMode){
setTimeout(()=>{startListening();},500);
}else{
stopSpeech();
if(recognitionRef.current) recognitionRef.current.stop();
}
},[voiceMode]);

/* ---------------- SPEECH ---------------- */

const speakText=(text)=>{
const speech=new SpeechSynthesisUtterance(text);
speech.lang = /[a-z]/i.test(text) ? "en-US" : "hi-IN";

window.speechSynthesis.cancel();
window.speechSynthesis.speak(speech);

if(voiceMode){
speech.onend=()=>{
if(voiceMode){
setTimeout(()=>{startListening();},800);
}
};
}
};

const stopSpeech=()=>{
window.speechSynthesis.cancel();
};

const startListening=()=>{
stopSpeech();

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if(!SpeechRecognition){
alert("Speech recognition not supported");
return;
}

if(recognitionRef.current){
recognitionRef.current.stop();
}

const recognition=new SpeechRecognition();
recognition.lang="en-US";
recognition.continuous=true;
recognition.interimResults=true;

recognitionRef.current=recognition;

recognition.start();
setIsListening(true);

recognition.onresult=(event)=>{
const transcript=Array.from(event.results)
.map(result=>result[0])
.map(result=>result.transcript)
.join("");

setMessage(transcript);

clearTimeout(silenceTimerRef.current);

silenceTimerRef.current=setTimeout(()=>{
recognition.stop();
setIsListening(false);
sendMessage(transcript.trim());
},1500);
};

recognition.onend=()=>{
setIsListening(false);
};
};

const stopThinking=()=>{
if(controllerRef.current){
controllerRef.current.abort();
}

stopSpeech();

if(recognitionRef.current){
recognitionRef.current.stop();
}

setLoading(false);
setIsStreaming(false);
};

/* ---------------- LOGIN ---------------- */

const handleLogin=()=>{
if(!email.trim() || !password.trim() || !name.trim()) return;

const userData={name,email};
localStorage.setItem("userData",JSON.stringify(userData));
setStoredUser(userData);

/* 🔥 SHOW PROFILE FIRST TIME */
if(!localStorage.getItem("profileData")){
setShowProfile(true);
}
};

const handleLogout=()=>{
localStorage.removeItem("userData");
setStoredUser(null);
setMessages([initialBotMessage]);
};

const loginKey=(e,next)=>{
if(e.key==="Enter"){
if(next==="email") document.getElementById("email").focus();
else if(next==="password") document.getElementById("password").focus();
else if(next==="login") handleLogin();
}
};

/* ---------------- IMAGE ---------------- */

const handleImage=(e)=>{
const file=e.target.files[0];
if(!file) return;

setImage(file);

const reader=new FileReader();
reader.onload=()=>setPreview(reader.result);
reader.readAsDataURL(file);
};

const removeImage=()=>{
setImage(null);
setPreview(null);
};

/* ---------------- STREAM ---------------- */

const streamText = async (text) => {
let current = "";

for (let i = 0; i < text.length; i++) {
current += text[i];

setMessages(prev => {
if(prev.length === 0) return prev;

const updated = [...prev];

updated[updated.length - 1] = {
...updated[updated.length - 1],
text: current
};

return updated;
});

await new Promise(res => setTimeout(res, 8));
}
};

/* ---------------- NEW CHAT ---------------- */

const createNewChat = () => {
setMessages([initialBotMessage]);
setChatTitle("New Chat");
};

/* ---------------- LOAD CHAT ---------------- */

const loadChat = (chat) => {
setMessages(chat.messages);
setChatTitle(chat.title);
};

/* ---------------- SEND ---------------- */

const sendMessage=async(voiceInput=null)=>{

const text = (voiceInput ?? message).trim();
if((!text || text.length < 2) && !image) return;

stopSpeech();

/* remove welcome */
let updatedMessages = [...messages];
if(
updatedMessages.length === 1 &&
updatedMessages[0].text === initialBotMessage.text
){
updatedMessages = [];
}

const updated=[...updatedMessages,{type:"user",text:text,image:preview}];

setMessages(updated);
setMessage("");
setPreview(null);

setLoading(true);
setIsStreaming(false);

let base64Image=null;

if(image){
const reader=new FileReader();
base64Image=await new Promise(resolve=>{
reader.onload=()=>resolve(reader.result);
reader.readAsDataURL(image);
});
}

controllerRef.current=new AbortController();

try{
console.log("KEY:", import.meta.env.VITE_API_KEY);
const response=await fetch("https://medicare-ai-2pa2.onrender.com/ask",{
method:"POST",
headers:{
  "Content-Type":"application/json",
  "x-api-key": import.meta.env.VITE_API_KEY
},
signal:controllerRef.current.signal,
body:JSON.stringify({
message:text,
history:updated.slice(-6),
image:base64Image,
profile: profile
})
});

const raw = await response.text();
console.log(raw);
const data = JSON.parse(raw);


const botReply = data.reply || "Error occurred.";
const title = data.title || "New Chat";

if (chatTitle === "New Chat") {
  setChatTitle(title);
}

/* save chat */
setChatHistory(prev => {
  const updatedChat = {
    title: chatTitle === "New Chat" ? title : chatTitle,
    messages: [...updated, { type: "bot", text: botReply }]
  };

  const others = prev.filter(chat => chat.title !== chatTitle);

  return [updatedChat, ...others];
});

/* streaming */
setIsStreaming(true);

setMessages(prev=>[
...prev,
{type:"bot",text:""}
]);

await streamText(botReply);

setIsStreaming(false);

if(voiceMode){
speakText(botReply);
}

}
catch(err){
console.error(err);

setMessages(prev=>[
...prev,
{type:"bot",text:"Server connection failed."}
]);
}
finally{
setLoading(false);
}

setImage(null);
};

/* ---------------- BOT FORMAT ---------------- */

const renderBotMessage=(text)=>{
const lines=text.split("\n");

return lines.map((line,index)=>{
const match=line.match(/Risk level:\s*(High|Medium|Low|Emergency|Undetermined)/i);

if(match){
const level=match[1].toLowerCase();
return(
<div key={index}>
Risk level: <span className={"risk "+level}>{match[1]}</span>
</div>
);
}

return <div key={index}>{line}</div>;
});
};

/* ---------------- LOGIN PAGE ---------------- */

/* 🔥 PROFILE POPUP */
if(showProfile){
return(
<div className="login-page">
<div className="login-card">

<h2>Optional Health Info</h2>

<input placeholder="Weight (kg)"
value={profile.weight}
onChange={(e)=>setProfile({...profile,weight:e.target.value})}
/>

<input placeholder="Height (cm)"
value={profile.height}
onChange={(e)=>setProfile({...profile,height:e.target.value})}
/>

<input placeholder="Gender"
value={profile.gender}
onChange={(e)=>setProfile({...profile,gender:e.target.value})}
/>

<input placeholder="Diseases"
value={profile.diseases}
onChange={(e)=>setProfile({...profile,diseases:e.target.value})}
/>

<input placeholder="Medications"
value={profile.medications}
onChange={(e)=>setProfile({...profile,medications:e.target.value})}
/>

<button className="login-btn" onClick={saveProfile}>
Save
</button>

<button className="login-btn" onClick={()=>setShowProfile(false)}>
Skip
</button>

</div>
</div>
);
}

if(!storedUser){
return(
<div className="login-page">
<div className="login-card">
<h1>MediCare AI</h1>

<input type="text" placeholder="Full Name" value={name}
onChange={(e)=>setName(e.target.value)}
/>

<input id="email" type="email" placeholder="Email Address"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>

<input id="password" type="password" placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<button className="login-btn" onClick={handleLogin}>
Login
</button>

</div>
</div>
);
}

/* ---------------- CHAT UI ---------------- */

const filteredChats = chatHistory.filter(chat =>
chat.title.toLowerCase().includes(search.toLowerCase())
);

return(
<div className={darkMode ? "app dark":"app"}>

<aside className="sidebar">
<h2>{chatTitle}</h2>

<p className="user-name" onClick={()=>setShowProfile(true)}>
👤 {storedUser.name}
</p>

<button className="toggle-btn" onClick={createNewChat}>
➕ New Chat
</button>



<button className="toggle-btn"
onClick={()=>setDarkMode(!darkMode)}>
{darkMode ? "☀ Light Mode":"🌙 Dark Mode"}
</button>

<button className="toggle-btn"
onClick={()=>setVoiceMode(!voiceMode)}>
{voiceMode ? "🔴 Exit Hands-Free Mode":"🎤 Hands-Free Mode"}
</button>

<button className="logout-btn"
onClick={handleLogout}>
Logout
</button>


<input
type="text"
placeholder="Search chats..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
className="search-bar"
/>

<div className="chat-history">
{filteredChats.map((chat,index)=>(
<div key={index}
className="chat-item"
onClick={()=>loadChat(chat)}>
{chat.title}
</div>
))}
</div>

</aside>

<main className="chat-area">

<div className="messages">

{messages.map((msg,index)=>(
<div key={index} className={`message ${msg.type}`}>

{msg.image && (
<img src={msg.image}
style={{maxWidth:"200px",borderRadius:"10px",marginBottom:"8px"}}
/>
)}

{msg.type==="bot" ? (
<>
{renderBotMessage(msg.text)}

{!voiceMode && (
<div className="speech-controls">
<button className="speak-btn" onClick={()=>speakText(msg.text)}>🔊</button>
<button className="stop-btn" onClick={stopSpeech}>⏹</button>
</div>
)}
</>
):(
msg.text
)}

</div>
))}

{loading && !isStreaming && (
<div className="message bot typing">
<span></span><span></span><span></span>
</div>
)}

<div ref={messagesEndRef}></div>

</div>

{preview && (
<div style={{padding:"10px"}}>
<img src={preview} style={{maxWidth:"150px",borderRadius:"10px"}}/>
<button onClick={removeImage}>❌</button>
</div>
)}

<div className="input-bar">

<input type="file" accept="image/*"
ref={fileInputRef}
style={{display:"none"}}
onChange={handleImage}
/>

<button className="icon-btn attach"
onClick={()=>fileInputRef.current.click()}>
📎
</button>

<button
className={`icon-btn mic ${isListening ? "active" : ""}`}
onClick={()=>{
if(isListening){
recognitionRef.current?.stop();
setIsListening(false);
}else{
startListening();
}
}}>
{isListening ? "⏹" : "🎤"}
</button>

<input type="text"
placeholder="Type your message..."
value={message}
onChange={(e)=>setMessage(e.target.value)}
onKeyDown={(e)=>e.key==="Enter" && sendMessage()}
/>

<button className="send-btn"
onClick={()=> loading ? stopThinking() : sendMessage()}
>
{loading ? "Stop":"Send"}
</button>

</div>

</main>

</div>
);
}

export default App;
