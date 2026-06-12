import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db, firebaseReady } from './firebase';
import { createRoot } from 'react-dom/client';
import { CalendarDays, ChefHat, Clapperboard, Coins, Heart, Home, LogOut, Menu, Plus, Target, Trash2, Users, Edit3, FileDown, Search, Settings, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import './styles.css';

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0,10);
const money = n => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(n || 0));
const niceDate = d => d ? new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '';

const starter = {
  users: [],
  currentUser: null,
  family: { name: 'Our Home', inviteCode: 'LOVE-' + Math.floor(1000 + Math.random()*9000), members: [] },
  events: [
    { id: uid(), title:'Anniversary dinner', date: today(), time:'19:30', category:'Anniversary', description:'Book a cozy place and bring flowers.', reminder:'1 day before' }
  ],
  meals: [
    { id: uid(), day:'Monday', type:'Dinner', meal:'Pasta night', habit:'Home-cooked', notes:'Tomatoes, basil, parmesan' },
    { id: uid(), day:'Wednesday', type:'Lunch', meal:'Salad bowls', habit:'Healthy', notes:'Add chickpeas and avocado' }
  ],
  goals: [
    { id: uid(), title:'Save for summer trip', description:'Build a shared travel fund.', category:'Travel', targetDate:'2026-08-15', status:'In Progress', progress:45, notes:'Check flight prices monthly.' }
  ],
  movies: [
    { id: uid(), title:'Before Sunrise', dateWatched: today(), genre:'Romance', rating:5, review:'Perfect cozy evening movie.', watchedWith:'Partner', favorite:true }
  ],
  expenses: [
    { id: uid(), title:'Groceries', amount:84.5, date:today(), category:'Groceries', paidBy:'Me', method:'Card', notes:'Weekly shop' },
    { id: uid(), title:'Movie snacks', amount:18.2, date:today(), category:'Entertainment', paidBy:'Partner', method:'Cash', notes:'Friday night' }
  ]
};


const emptySharedData = () => ({
  users: [],
  currentUser: null,
  family: { name: 'Our Home', inviteCode: 'LOVE-' + Math.floor(1000 + Math.random()*9000), members: [] },
  events: [],
  meals: [],
  goals: [],
  movies: [],
  expenses: []
});
const makeInviteCode = () => 'LOVE-' + Math.floor(100000 + Math.random()*900000);
const makeMember = (firebaseUser, name, role='Owner') => ({ id: firebaseUser.uid, name: name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member', email: firebaseUser.email, role });


const nav = [
  ['dashboard','Dashboard',Home], ['calendar','Calendar',CalendarDays], ['meals','Meals',ChefHat], ['goals','Goals',Target], ['movies','Movies',Clapperboard], ['expenses','Expenses',Coins], ['settings','Family',Settings]
];
const categories = {
  event:['Date Night','Birthday','Anniversary','Memory','Family','Reminder'],
  goal:['Finance','Travel','Fitness','Relationship','Home','Family','Personal Growth'],
  expense:['Groceries','Dining','Rent','Utilities','Travel','Entertainment','Shopping','Healthcare','Other'],
  movie:['Action','Comedy','Drama','Romance','Thriller','Family','Documentary','Sci-Fi','Animation']
};
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const mealTypes = ['Breakfast','Lunch','Dinner','Snacks'];
const habits = ['Home-cooked','Eating out','Healthy','Skipped','Treat meal'];

function App(){
  const [data,setData] = useState(emptySharedData);
  const [page,setPage] = useState('auth');
  const [mobileOpen,setMobileOpen] = useState(false);
  const [firebaseUser,setFirebaseUser] = useState(null);
  const [familyId,setFamilyId] = useState(null);
  const [loading,setLoading] = useState(true);
  const [setupError,setSetupError] = useState(!firebaseReady ? 'Firebase is not configured yet. Add your Firebase environment variables in Netlify first.' : '');

  useEffect(()=>{
    if(!firebaseReady){ setLoading(false); return; }
    return onAuthStateChanged(auth, async user => {
      setLoading(true);
      setFirebaseUser(user);
      if(!user){
        setFamilyId(null);
        setData(emptySharedData());
        setPage('auth');
        setLoading(false);
        return;
      }
      const profile = await getDoc(doc(db,'users',user.uid));
      if(profile.exists()){
        setFamilyId(profile.data().familyId);
        setPage('dashboard');
      } else {
        setSetupError('Your login exists, but no TogetherHub family profile was found. Please create a new account or contact the family owner.');
        setLoading(false);
      }
    });
  },[]);

  useEffect(()=>{
    if(!firebaseReady || !familyId || !firebaseUser) return;
    const ref = doc(db,'families',familyId);
    return onSnapshot(ref, snap => {
      if(snap.exists()){
        setData({ ...emptySharedData(), ...snap.data(), currentUser: firebaseUser.email });
      }
      setLoading(false);
    }, err => {
      setSetupError(err.message);
      setLoading(false);
    });
  },[familyId,firebaseUser]);

  const update = async patch => {
    setData(d => ({...d,...patch}));
    if(firebaseReady && familyId){
      await setDoc(doc(db,'families',familyId), patch, { merge:true });
    }
  };

  const user = data.users.find(u => u.email === data.currentUser) || data.family.members.find(m => m.email === data.currentUser);
  if(loading) return <div className="auth-page"><div className="auth-card"><div className="logo-big"><Heart/> TogetherHub</div><h1>Loading your shared home...</h1><p>Connecting securely with Firebase.</p></div></div>;
  if(!firebaseUser) return <Auth setupError={setupError} />;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div className="brand"><div className="brand-icon"><Heart size={24}/></div><div><h1>TogetherHub</h1><p>{data.family.name}</p></div></div>
      <nav>{nav.map(([id,label,Icon]) => <button key={id} onClick={()=>{setPage(id);setMobileOpen(false)}} className={page===id?'active':''}><Icon size={19}/>{label}</button>)}</nav>
      <button className="logout" onClick={()=>signOut(auth)}><LogOut size={18}/> Sign out</button>
    </aside>
    <main className="main">
      <header className="topbar"><button className="hamb" onClick={()=>setMobileOpen(!mobileOpen)}><Menu/></button><div><p className="eyebrow">Welcome back, {user?.name || 'friend'}</p><h2>{nav.find(n=>n[0]===page)?.[1] || 'Dashboard'}</h2></div><div className="avatar"><Users size={18}/>{data.family.members.length || 1}</div></header>
      {page==='dashboard' && <Dashboard data={data} setPage={setPage}/>} 
      {page==='calendar' && <CalendarPage data={data} update={update}/>} 
      {page==='meals' && <MealsPage data={data} update={update}/>} 
      {page==='goals' && <GoalsPage data={data} update={update}/>} 
      {page==='movies' && <MoviesPage data={data} update={update}/>} 
      {page==='expenses' && <ExpensesPage data={data} update={update}/>} 
      {page==='settings' && <SettingsPage data={data} update={update}/>} 
    </main>
  </div>
}

function Auth({setupError}){
  const [mode,setMode] = useState('login');
  const [form,setForm] = useState({name:'',email:'',password:'',inviteCode:''});
  const [error,setError] = useState(setupError || '');

  useEffect(()=>setError(setupError || ''),[setupError]);

  const submit = async e => {
    e.preventDefault(); setError('');
    if(!firebaseReady) return setError('Firebase is not configured yet. Add the VITE_FIREBASE_* environment variables in Netlify, then redeploy.');
    if(!form.email || !form.password || (mode==='signup' && !form.name)) return setError('Please complete all required fields.');
    try {
      if(mode==='signup'){
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        let familyId = cred.user.uid;
        let role = 'Owner';
        const member = makeMember(cred.user, form.name, role);
        const invite = form.inviteCode.trim().toUpperCase();
        if(invite){
          const q = query(collection(db,'families'), where('family.inviteCode','==',invite));
          const found = await getDocs(q);
          if(found.empty) throw new Error('Invite code not found. Please check the code from your partner or family owner.');
          const familyDoc = found.docs[0];
          familyId = familyDoc.id;
          role = 'Family Member';
          const existing = familyDoc.data();
          const joined = makeMember(cred.user, form.name, role);
          await setDoc(doc(db,'families',familyId), {
            users:[...(existing.users || []), joined],
            family:{...(existing.family || {}), members:[...((existing.family && existing.family.members) || []), joined]}
          }, { merge:true });
        } else {
          const initial = emptySharedData();
          initial.users = [member];
          initial.family = { name: `${form.name}'s Home`, inviteCode: makeInviteCode(), members:[member] };
          await setDoc(doc(db,'families',familyId), { ...initial, createdAt: serverTimestamp() });
        }
        await setDoc(doc(db,'users',cred.user.uid), { uid:cred.user.uid, email:cred.user.email, name:form.name, role, familyId, createdAt:serverTimestamp() });
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      }
    } catch(err){
      const msg = err?.message?.replace('Firebase: ','').replace(/\(auth\/.+\)\.?/,'') || 'Something went wrong.';
      setError(msg);
    }
  };
  return <div className="auth-page"><div className="auth-card"><div className="logo-big"><Heart/> TogetherHub</div><h1>Your shared digital home</h1><p>Plan memories, meals, goals, movies, and shared expenses in one warm family space.</p><form onSubmit={submit}>{mode==='signup' && <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}<label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Minimum 6 characters" minLength="6"/></label>{mode==='signup' && <label>Invite code <small>(optional)</small><input value={form.inviteCode} onChange={e=>setForm({...form,inviteCode:e.target.value})} placeholder="LOVE-123456"/></label>}{error && <div className="error">{error}</div>}<button className="primary">{mode==='signup'?'Create Account':'Sign In'}</button></form><p className="switch">{mode==='signup'?'Already have an account?':'New users should tap Create Account first.'} <button onClick={()=>setMode(mode==='signup'?'login':'signup')}>{mode==='signup'?'Sign in':'Create Account'}</button></p></div><div className="hero-card"><Sparkles/><h2>Made for couples and families</h2><p>Accounts and shared family data now sync securely through Firebase.</p></div></div>
}

function Section({title,action,children}){ return <section className="section"><div className="section-head"><h3>{title}</h3>{action}</div>{children}</section> }
function Empty({text}){ return <div className="empty"><Heart size={20}/><p>{text}</p></div> }
function CardGrid({children}){ return <div className="card-grid">{children}</div> }
function Stat({label,value,icon}){ return <div className="stat"><span>{icon}</span><div><b>{value}</b><p>{label}</p></div></div> }

function Dashboard({data,setPage}){
  const upcoming = [...data.events].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,4);
  const activeGoals = data.goals.filter(g=>g.status!=='Achieved').slice(0,3);
  const recentExpenses = [...data.expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  const monthTotal = data.expenses.filter(e=>new Date(e.date).getMonth()===new Date().getMonth()).reduce((s,e)=>s+Number(e.amount),0);
  return <div className="dashboard"><div className="welcome-panel"><div><p className="eyebrow">Shared life, beautifully organized</p><h2>Everything your home is planning lives here.</h2><p>Track dates, meals, goals, movies, and spending in one place.</p></div><button onClick={()=>setPage('calendar')} className="primary"><Plus size={18}/> Add memory</button></div><div className="stats-row"><Stat icon="📅" label="Upcoming events" value={upcoming.length}/><Stat icon="🥗" label="Meals planned" value={data.meals.length}/><Stat icon="🎯" label="Active goals" value={activeGoals.length}/><Stat icon="💸" label="This month" value={money(monthTotal)}/></div><div className="two-col"><Section title="Upcoming events">{upcoming.length?upcoming.map(e=><Mini key={e.id} title={e.title} meta={`${niceDate(e.date)} • ${e.time} • ${e.category}`}/>):<Empty text="No dates yet. Add your next memory."/>}</Section><Section title="This week’s meal plan">{data.meals.slice(0,5).map(m=><Mini key={m.id} title={`${m.day} ${m.type}: ${m.meal}`} meta={`${m.habit} • ${m.notes || 'No notes'}`}/>)}</Section><Section title="Active goals">{activeGoals.map(g=><Mini key={g.id} title={g.title} meta={`${g.category} • ${g.progress}% complete`} progress={g.progress}/>)}</Section><Section title="Recent expenses">{recentExpenses.map(e=><Mini key={e.id} title={`${e.title} — ${money(e.amount)}`} meta={`${niceDate(e.date)} • ${e.category} • Paid by ${e.paidBy}`}/>)}</Section></div></div>
}
function Mini({title,meta,progress}){return <div className="mini"><div><b>{title}</b><p>{meta}</p>{progress!==undefined && <div className="progress"><span style={{width:`${progress}%`}}/></div>}</div></div>}

function CrudList({items,render,onDelete}){return <div className="list">{items.length?items.map(item=><div className="item" key={item.id}>{render(item)}<button className="icon danger" onClick={()=>onDelete(item.id)}><Trash2 size={17}/></button></div>):<Empty text="Nothing here yet. Add the first one."/>}</div>}
function useForm(initial){ const [form,setForm]=useState(initial); return [form,(k,v)=>setForm(f=>({...f,[k]:v})),setForm]; }

function CalendarPage({data,update}){const blank={title:'',date:today(),time:'18:00',category:'Date Night',description:'',reminder:'None'}; const [form,set,setForm]=useForm(blank); const [edit,setEdit]=useState(null); const save=e=>{e.preventDefault(); if(!form.title||!form.date) return; update({events: edit ? data.events.map(x=>x.id===edit?{...form,id:edit}:x) : [...data.events,{...form,id:uid()}]}); setForm(blank); setEdit(null)}; const del=id=>update({events:data.events.filter(x=>x.id!==id)}); return <><Entry title="Add calendar event" onSubmit={save}>{<><Input label="Title" v={form.title} set={v=>set('title',v)}/><Input label="Date" type="date" v={form.date} set={v=>set('date',v)}/><Input label="Time" type="time" v={form.time} set={v=>set('time',v)}/><Select label="Category" v={form.category} set={v=>set('category',v)} opts={categories.event}/><Select label="Reminder" v={form.reminder} set={v=>set('reminder',v)} opts={['None','At time','1 hour before','1 day before','1 week before']}/><Text label="Notes" v={form.description} set={v=>set('description',v)}/><button className="primary">{edit?'Update':'Add'} event</button></>}</Entry><Section title="Shared calendar"><CrudList items={[...data.events].sort((a,b)=>new Date(a.date)-new Date(b.date))} onDelete={del} render={e=><><div><b>{e.title}</b><p>{niceDate(e.date)} at {e.time} • {e.category} • Reminder: {e.reminder}</p><small>{e.description}</small></div><button className="icon" onClick={()=>{setForm(e);setEdit(e.id)}}><Edit3 size={17}/></button></>}/></Section></>}

function MealsPage({data,update}){const blank={day:'Monday',type:'Dinner',meal:'',habit:'Home-cooked',notes:''}; const [form,set,setForm]=useForm(blank); const [edit,setEdit]=useState(null); const save=e=>{e.preventDefault(); if(!form.meal) return; update({meals: edit?data.meals.map(x=>x.id===edit?{...form,id:edit}:x):[...data.meals,{...form,id:uid()}]});setForm(blank);setEdit(null)}; const grouped = days.map(day=>({day, meals:data.meals.filter(m=>m.day===day)})); const summary = habits.map(h=>({name:h,value:data.meals.filter(m=>m.habit===h).length})).filter(x=>x.value); return <><Entry title="Plan a meal" onSubmit={save}><Select label="Day" v={form.day} set={v=>set('day',v)} opts={days}/><Select label="Meal type" v={form.type} set={v=>set('type',v)} opts={mealTypes}/><Input label="Meal" v={form.meal} set={v=>set('meal',v)}/><Select label="Food habit" v={form.habit} set={v=>set('habit',v)} opts={habits}/><Text label="Recipe / ingredients" v={form.notes} set={v=>set('notes',v)}/><button className="primary">{edit?'Update':'Add'} meal</button></Entry><Section title="Weekly calendar-style meal plan"><div className="week-grid">{grouped.map(g=><div className="day-card" key={g.day}><h4>{g.day}</h4>{g.meals.length?g.meals.map(m=><div className="pill-row" key={m.id}><span>{m.type}</span><b>{m.meal}</b><button onClick={()=>{setForm(m);setEdit(m.id)}}><Edit3 size={14}/></button><button onClick={()=>update({meals:data.meals.filter(x=>x.id!==m.id)})}><Trash2 size={14}/></button></div>):<p className="muted">No meals</p>}</div>)}</div></Section><Section title="Eating pattern summary"><Chart data={summary} type="bar"/></Section></>}

function GoalsPage({data,update}){const blank={title:'',description:'',category:'Finance',targetDate:today(),status:'Not Started',progress:0,notes:''}; const [form,set,setForm]=useForm(blank); const [edit,setEdit]=useState(null); const save=e=>{e.preventDefault(); if(!form.title) return; update({goals:edit?data.goals.map(x=>x.id===edit?{...form,id:edit}:x):[...data.goals,{...form,id:uid()}]}); setForm(blank); setEdit(null)}; return <><Entry title="Add shared goal" onSubmit={save}><Input label="Goal title" v={form.title} set={v=>set('title',v)}/><Select label="Category" v={form.category} set={v=>set('category',v)} opts={categories.goal}/><Input label="Target date" type="date" v={form.targetDate} set={v=>set('targetDate',v)}/><Select label="Status" v={form.status} set={v=>set('status',v)} opts={['Not Started','In Progress','Achieved']}/><Input label="Progress %" type="number" v={form.progress} set={v=>set('progress',Math.max(0,Math.min(100,v)))}/><Text label="Description" v={form.description} set={v=>set('description',v)}/><Text label="Milestones / notes" v={form.notes} set={v=>set('notes',v)}/><button className="primary">{edit?'Update':'Add'} goal</button></Entry><CardGrid>{data.goals.map(g=><div className="goal-card" key={g.id}><div className="row"><h3>{g.title}</h3><button onClick={()=>{setForm(g);setEdit(g.id)}}><Edit3 size={16}/></button><button onClick={()=>update({goals:data.goals.filter(x=>x.id!==g.id)})}><Trash2 size={16}/></button></div><p>{g.description}</p><div className="tagline"><span>{g.category}</span><span>{g.status}</span><span>{niceDate(g.targetDate)}</span></div><div className="progress"><span style={{width:`${g.progress}%`}}/></div><small>{g.progress}% • {g.notes}</small></div>)}</CardGrid></>}

function MoviesPage({data,update}){const blank={title:'',dateWatched:today(),genre:'Romance',rating:5,review:'',watchedWith:'Partner',favorite:false}; const [form,set,setForm]=useForm(blank); const [query,setQuery]=useState(''); const [edit,setEdit]=useState(null); const save=e=>{e.preventDefault(); if(!form.title) return; update({movies:edit?data.movies.map(x=>x.id===edit?{...form,id:edit}:x):[...data.movies,{...form,id:uid()}]});setForm(blank);setEdit(null)}; const list=data.movies.filter(m=>m.title.toLowerCase().includes(query.toLowerCase())||m.genre.toLowerCase().includes(query.toLowerCase())); return <><Entry title="Add movie memory" onSubmit={save}><Input label="Movie title" v={form.title} set={v=>set('title',v)}/><Input label="Date watched" type="date" v={form.dateWatched} set={v=>set('dateWatched',v)}/><Select label="Genre" v={form.genre} set={v=>set('genre',v)} opts={categories.movie}/><Input label="Rating" type="number" v={form.rating} set={v=>set('rating',Math.max(1,Math.min(5,v)))}/><Input label="Watched with" v={form.watchedWith} set={v=>set('watchedWith',v)}/><label className="check"><input type="checkbox" checked={form.favorite} onChange={e=>set('favorite',e.target.checked)}/> Favorite</label><Text label="Review / notes" v={form.review} set={v=>set('review',v)}/><button className="primary">{edit?'Update':'Add'} movie</button></Entry><Section title="Movie tracker" action={<div className="search"><Search size={16}/><input placeholder="Search movies" value={query} onChange={e=>setQuery(e.target.value)}/></div>}><CrudList items={list} onDelete={id=>update({movies:data.movies.filter(x=>x.id!==id)})} render={m=><><div><b>{m.favorite?'❤️ ':''}{m.title}</b><p>{niceDate(m.dateWatched)} • {m.genre} • {'★'.repeat(Number(m.rating))} • With {m.watchedWith}</p><small>{m.review}</small></div><button className="icon" onClick={()=>{setForm(m);setEdit(m.id)}}><Edit3 size={17}/></button></>}/></Section></>}

function ExpensesPage({data,update}){const blank={title:'',amount:'',date:today(),category:'Groceries',paidBy:'Me',method:'Card',notes:''}; const [form,set,setForm]=useForm(blank); const [edit,setEdit]=useState(null); const [filter,setFilter]=useState({from:'',to:'',category:'All'}); const save=e=>{e.preventDefault(); if(!form.title||!form.amount) return; update({expenses:edit?data.expenses.map(x=>x.id===edit?{...form,amount:Number(form.amount),id:edit}:x):[...data.expenses,{...form,amount:Number(form.amount),id:uid()}]});setForm(blank);setEdit(null)}; const filtered=data.expenses.filter(e=>(!filter.from||e.date>=filter.from)&&(!filter.to||e.date<=filter.to)&&(filter.category==='All'||e.category===filter.category)); const total=filtered.reduce((s,e)=>s+Number(e.amount),0); const byCat=categories.expense.map(c=>({name:c,value:filtered.filter(e=>e.category===c).reduce((s,e)=>s+Number(e.amount),0)})).filter(x=>x.value); const overTime=Object.values(filtered.reduce((a,e)=>{a[e.date]=a[e.date]||{date:e.date,total:0};a[e.date].total+=Number(e.amount);return a;},{})).sort((a,b)=>a.date.localeCompare(b.date)); const pdf=()=>{const doc=new jsPDF(); doc.setFontSize(20); doc.text('TogetherHub Expense Report',14,18); doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString('en-GB').replaceAll('/','-')}`,14,26); doc.text(`Period: ${filter.from||'Start'} to ${filter.to||'Today'} | Category: ${filter.category}`,14,34); doc.setFontSize(14); doc.text(`Total Spending: ${money(total)}`,14,46); let y=58; filtered.forEach((e,i)=>{ if(y>280){doc.addPage(); y=18;} doc.setFontSize(11); doc.text(`${i+1}. ${e.date} | ${e.title} | ${e.category} | ${money(e.amount)} | Paid by ${e.paidBy}`,14,y); y+=8; }); doc.save('togetherhub-expense-report.pdf');}; return <><Entry title="Add expense" onSubmit={save}><Input label="Title" v={form.title} set={v=>set('title',v)}/><Input label="Amount" type="number" v={form.amount} set={v=>set('amount',v)}/><Input label="Date" type="date" v={form.date} set={v=>set('date',v)}/><Select label="Category" v={form.category} set={v=>set('category',v)} opts={categories.expense}/><Input label="Paid by" v={form.paidBy} set={v=>set('paidBy',v)}/><Select label="Payment method" v={form.method} set={v=>set('method',v)} opts={['Cash','Card','Bank transfer','UPI','PayPal','Other']}/><Text label="Notes" v={form.notes} set={v=>set('notes',v)}/><button className="primary">{edit?'Update':'Add'} expense</button></Entry><Section title="Report period & filters" action={<button className="secondary" onClick={pdf}><FileDown size={17}/> Download PDF</button>}><div className="filters"><Input label="From" type="date" v={filter.from} set={v=>setFilter({...filter,from:v})}/><Input label="To" type="date" v={filter.to} set={v=>setFilter({...filter,to:v})}/><Select label="Category" v={filter.category} set={v=>setFilter({...filter,category:v})} opts={['All',...categories.expense]}/><div className="total-box"><b>{money(total)}</b><span>Total spending</span></div></div></Section><div className="two-col"><Section title="Spending by category"><Chart data={byCat} type="pie"/></Section><Section title="Spending over time"><Chart data={overTime} type="line"/></Section></div><Section title="Expense records"><CrudList items={filtered} onDelete={id=>update({expenses:data.expenses.filter(x=>x.id!==id)})} render={e=><><div><b>{e.title} — {money(e.amount)}</b><p>{niceDate(e.date)} • {e.category} • Paid by {e.paidBy} via {e.method}</p><small>{e.notes}</small></div><button className="icon" onClick={()=>{setForm(e);setEdit(e.id)}}><Edit3 size={17}/></button></>}/></Section></>}

function SettingsPage({data,update}){const [email,setEmail]=useState(''); const [name,setName]=useState(''); const add=e=>{e.preventDefault(); if(!email||!name) return; const member={id:uid(), name, email, role:'Family Member'}; update({users:[...data.users,member], family:{...data.family,members:[...data.family.members,member]}}); setEmail(''); setName('')}; return <><Section title="Family settings"><div className="settings-card"><h3>{data.family.name}</h3><p>Invite code: <b>{data.family.inviteCode}</b></p><p className="muted">This prototype stores shared data locally in your browser. Connect Supabase, Firebase, or another backend for real multi-device sharing.</p></div></Section><Entry title="Invite partner or family member" onSubmit={add}><Input label="Name" v={name} set={setName}/><Input label="Email" type="email" v={email} set={setEmail}/><button className="primary">Add member</button></Entry><Section title="Members and roles"><CrudList items={data.family.members} onDelete={id=>update({family:{...data.family,members:data.family.members.filter(m=>m.id!==id)}})} render={m=><div><b>{m.name}</b><p>{m.email} • {m.role}</p></div>}/></Section></>}

function Entry({title,onSubmit,children}){return <section className="entry"><h3>{title}</h3><form onSubmit={onSubmit} className="form-grid">{children}</form></section>}
function Input({label,v,set,type='text'}){return <label>{label}<input type={type} value={v} onChange={e=>set(e.target.value)} required={label==='Title'||label.includes('title')||label==='Amount'||label==='Email'||label==='Password'}/></label>}
function Select({label,v,set,opts}){return <label>{label}<select value={v} onChange={e=>set(e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select></label>}
function Text({label,v,set}){return <label className="wide">{label}<textarea value={v} onChange={e=>set(e.target.value)} rows="3"/></label>}
function Chart({data,type}){ if(!data.length) return <Empty text="Not enough data for a chart yet."/>; if(type==='pie') return <div className="chart"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>{data.map((_,i)=><Cell key={i}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div>; if(type==='line') return <div className="chart"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={v=>money(v)}/><Line type="monotone" dataKey="total" strokeWidth={3}/></LineChart></ResponsiveContainer></div>; return <div className="chart"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div> }

createRoot(document.getElementById('root')).render(<App/>);
