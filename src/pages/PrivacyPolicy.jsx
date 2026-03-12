import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-12">
          <Link 
            to="/" 
            className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors inline-block mb-8"
          >
            FLIP-FM
          </Link>
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: March 12, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          
          {/* Intro */}
          <section>
            <p className="text-lg text-gray-300 leading-relaxed">
              Hey there! 👋 We at FLip-FM value your privacy, we're a small music discovery community built by music lovers, for music lovers. 
              We take your privacy seriously, but we also want to be upfront and honest about how everything works. 
              No corporate jargon.
            </p>
          </section>

          {/* What We Collect */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What We Collect</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Account Info</h3>
                <p className="text-gray-300">Your email address, username, password (encrypted!, We can't see this even if we tried, so keep it safe.), and bio. We need this to create your account and let you log in.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Your Music Taste</h3>
                <p className="text-gray-300">The 4 albums you add to your crate. This is your public profile - everyone can see these. That's the whole point!</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Profile Picture</h3>
                <p className="text-gray-300">If you upload one, we store it so people can see your face (or whatever pic you choose).</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Messages</h3>
                <p className="text-gray-300">Once you start chatting, we'll store your messages so you can have conversations with other users.</p>
              </div>
            </div>
          </section>

          {/* Third Party Services */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Third-Party Tools We Use</h2>
            <p className="text-gray-300 mb-4">
              We're a small team, so we use some trusted tools to make Flip-FM work. Here's the complete list:
            </p>
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-400 mb-2">🔐 Supabase</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Handles user accounts, passwords (encrypted), database storage, and authentication. 
                  Your password is hashed and encrypted - even we can't see it. 
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                    Supabase Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-pink-400 mb-2">📧 Resend</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Sends verification emails and notifications. They only see your email address when we send you something. 
                  <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                    Resend Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-blue-400 mb-2">☁️ Vercel</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Hosts the website and makes it fast. They might see basic stuff like your IP address and browser type (standard web hosting nonsense). 
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                    Vercel Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-green-400 mb-2">🎵 Last.fm API</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We use Last.fm's public API to search for albums and get album info. They don't track you - we just ask them "hey, what's the cover art for this album?"
                </p>
              </div>
            </div>
          </section>

          {/* What We DON'T Do */}
          <section className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4 text-green-400">What We DON'T Do</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <span>We <strong>DON'T sell your data</strong> to anyone. Ever.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <span>We <strong>DON'T show ads</strong> or track you across the internet.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <span>We <strong>DON'T use cookies</strong> for tracking (just basic login stuff).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <span>We <strong>DON'T read your messages</strong> unless you report someone.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <span>We <strong>DON'T share your email</strong> with anyone other than moderators and admins inside FLip-FM (and only in a case of investigation).</span>
              </li>
            </ul>
          </section>

          {/* Public vs Private */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">What's Public vs Private</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-orange-400 mb-3">👁️ Public (Everyone Can See)</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Your username</li>
                  <li>• Your 4 albums</li>
                  <li>• Your bio</li>
                  <li>• Your profile picture</li>
                  <li>• Your match percentages with others</li>
                </ul>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-400 mb-3">🔒 Private (Only You See)</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Your email address (unless reported)</li>
                  <li>• Your password (encrypted)</li>
                  <li>• Your messages (unless reported)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* User-Generated Content */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Community & Content</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
              <p className="text-gray-300 leading-relaxed mb-4">
                Flip-FM is a community. That means you'll interact with other real people - and we can't control what they say or do. Here's the deal:
              </p>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>User Content:</strong> People can message you, and we can't pre-screen every message. If someone's being inappropriate, racist, offensive, or creepy - please report them immediately.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>Moderation:</strong> We have moderators who review reports and will ban bad actors. But we can't catch everything in real-time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>Your Safety:</strong> Don't share personal info (phone number, address, etc.) with strangers. <a href="https://www.freecodecamp.org/news/the-beginners-guide-to-online-privacy-7149b33c4a3e/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                    Be safe on the Internet!
                  </a></span>
                </li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">How We Protect Your Data</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We take security seriously:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li>• All passwords are encrypted with industry-standard bcrypt hashing</li>
              <li>• We use HTTPS/SSL encryption for all data in transit</li>
              <li>• Our database (Supabase) has enterprise-grade security</li>
              <li>• We never store your password in plain text - ever</li>
            </ul>
            <p className="text-sm text-gray-400 mt-4">
              That said, no system is 100% secure. Use a strong, unique password and enable two-factor authentication when available.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You're in control of your data. You can:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>Delete your account</strong> anytime from settings (coming soon)</li>
              <li>• <strong>Change your info</strong> whenever you want</li>
              <li>• <strong>Export your data</strong> by contacting us</li>
              <li>• <strong>Opt out of emails</strong> (except critical account stuff)</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Questions or Concerns?</h2>
            <p className="text-gray-300 leading-relaxed">
              We're a small team and we actually read messages. If you have questions, concerns, or want to request your data:
            </p>
            <p className="text-blue-400 mt-3">
              📧 Email us: <a href="mailto:arpithbinsa@gmail.com" className="underline hover:text-blue-300">arpithbinsa@gmail.com</a>
            </p>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We might update this privacy policy as we add new features. If we make big changes, we'll email you. 
              The "Last updated" date at the top will always show when we last changed something.
            </p>
          </section>

        </div>

        {/* Back Link */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <Link 
            to="/" 
            className="text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest text-sm"
          >
            ← Back to Flip-FM
          </Link>
        </div>

      </div>
    </div>
  );
}