import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/main/login');
  // redirect('/purchase');

}