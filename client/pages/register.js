import React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { auth } from '../components/authenticate'

export default function Register(){
  const [input, setInput] = useState({})
  const router = useRouter()
  function handleChange(e){
    setInput({...input, [e.target.name]: e.target.value})
  }
  function handleSubmit(event){
    event.preventDefault()
    fetch('http://localhost:3030/register', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })
      .then(res => res.text())
      .catch(err => console.error(err))
      .then(data => router.push('/login'))
  }
  return(
    <>
      <div>
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <label>username:
            <input type='text' name='username' onChange={handleChange} />
          </label>
          <label>email:
            <input type='text' name='email' onChange={handleChange} />
          </label>
          <label>password:
            <input type='password' name='password' onChange={handleChange} />
          </label>
          <input type="submit" value='submit' />
        </form>
        <Link href='/login'><a>Login</a></Link>
      </div>
    </>
  );
}

export async function getServerSideProps(ctx){
  return auth(ctx, '/')
}