import { Link } from "react-router-dom";

export default function Terms() {
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
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">Terms of Service</h1>
          <p className="text-gray-400">Last updated: March 12, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          
          {/* Intro */}
          <section>
            <p className="text-lg text-gray-300 leading-relaxed">
              Welcome to Flip-FM! 🎵 These terms are here to keep the community safe and fun for everyone. 
              We've tried to write this in plain English instead of legalese, but the rules still matter - 
              by using Flip-FM, you're agreeing to follow them.
            </p>
          </section>

          {/* The Basics */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">The Basics</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">1. Who Can Use Flip-FM</h3>
                <p className="text-gray-300">You must be at least 13 years old to use Flip-FM. If you're under 18, make sure your parent or guardian is cool with you using the site.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">2. Your Account</h3>
                <p className="text-gray-300">You're responsible for your account. Don't share your password, don't let others use your account, and pick a strong password. If someone hacks your account because you used "password123", that's on you.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">3. One Account Per Person</h3>
                <p className="text-gray-300">Don't make multiple accounts to game the system, spam people, or avoid bans. If you get banned, that's it - you're done.</p>
              </div>
            </div>
          </section>

          {/* Community Rules */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Community Rules</h2>
            <p className="text-gray-300 mb-4">
              Flip-FM is a music discovery community. To keep it that way, here's what's NOT allowed:
            </p>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-red-400 mb-4">🚫 Absolutely Forbidden</h3>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Hate speech, racism, sexism, homophobia, transphobia</strong> - Instant ban. No warnings.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Harassment or bullying</strong> - Don't be a jerk. If someone asks you to leave them alone, leave them alone.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Sexual content or solicitation</strong> - This isn't a dating app. Keep it about music.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Spam or advertising</strong> - Don't promote your SoundCloud, crypto scams, or MLM schemes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Impersonation</strong> - Don't pretend to be someone else or create fake profiles.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Illegal activity</strong> - Don't use Flip-FM to do illegal stuff. Seriously.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span><strong>Doxxing or sharing personal info</strong> - Don't share anyone's private information (addresses, phone numbers, etc.) without permission.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Content & Copyright */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Your Content & Copyright</h2>
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-400 mb-2">What You Post</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Your profile (username, bio, albums, messages) belongs to you. By posting on Flip-FM, you give us permission to display it on the site and show it to other users. That's literally the point of the app.
                </p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-400 mb-2">Album Covers & Music Data</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  We pull album covers and info from Last.fm's public API. We don't host or own this data - we just show it. 
                  All rights to album artwork belong to the respective record labels and artists.
                </p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-400 mb-2">Don't Steal Stuff</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Don't upload content you don't have the right to use. This includes using someone else's photos as your profile picture without permission.
                </p>
              </div>
            </div>
          </section>

          {/* Moderation */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Moderation & Enforcement</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
              <p className="text-gray-300 leading-relaxed mb-4">
                Here's how we handle rule violations:
              </p>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>Minor violations:</strong> Warning or temporary restriction. We're not monsters.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>Serious violations:</strong> Immediate ban. No appeals.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>We review reports:</strong> When someone reports you, we actually look into it. We're not perfect, but we try our best.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-yellow-400">⚠️</span>
                  <span><strong>We can't catch everything:</strong> We're a small team. If you see something bad, REPORT IT. We can't moderate what we don't know about.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Important Disclaimers</h2>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-orange-400 mb-2">We're Not Perfect</h3>
                <p className="text-gray-300 text-sm">
                  Flip-FM is provided "as is." We do our best to keep it running smoothly, but bugs happen, servers go down, and things break. 
                  We're not liable if you lose data, miss a message, or have a bad experience.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-orange-400 mb-2">User Interactions</h3>
                <p className="text-gray-300 text-sm">
                  You interact with other real people on Flip-FM. We can't control what they say or do. 
                  If someone's being inappropriate, report them - but we're not responsible for user behavior. 
                  Use common sense and stay safe.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-orange-400 mb-2">Third-Party Links</h3>
                <p className="text-gray-300 text-sm">
                  We link to Spotify, Google, and other external sites. We're not responsible for what happens when you leave Flip-FM.
                </p>
              </div>
            </div>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Deleting Your Account</h2>
            <p className="text-gray-300 leading-relaxed">
              You can delete your account anytime (feature coming soon). When you delete your account:
            </p>
            <ul className="space-y-2 text-gray-300 mt-4">
              <li>• Your profile, albums, and bio are permanently deleted</li>
              <li>• Your messages are deleted</li>
              <li>• Your username becomes available for others</li>
              <li>• This is permanent - we can't undo it</li>
            </ul>
            <p className="text-sm text-gray-400 mt-4">
              We can also terminate your account if you violate these terms. If you get banned, you can't make a new account.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Changes to These Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We might update these terms as we add features or if we need to change something. 
              If we make major changes, we'll email you. The "Last updated" date at the top shows when we last changed something. 
              By continuing to use Flip-FM after changes, you accept the new terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Legal Stuff</h2>
            <p className="text-gray-300 leading-relaxed text-sm">
              These terms are governed by German law (since that's where the developer is based). 
              If we have a dispute, we'll try to work it out like adults before getting lawyers involved.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Questions About These Terms?</h2>
            <p className="text-gray-300 leading-relaxed">
              If something in here is confusing or you want to report a violation:
            </p>
            <p className="text-blue-400 mt-3">
              📧 Email us: <a href="mailto:support@flip-fm.com" className="underline hover:text-blue-300">support@flip-fm.com</a>
            </p>
          </section>

          {/* TL;DR */}
          <section className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4">TL;DR</h2>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>✓ Be cool to people</li>
              <li>✓ Don't be racist, sexist, or hateful</li>
              <li>✓ Don't spam or harass</li>
              <li>✓ Don't share personal info</li>
              <li>✓ Report bad behavior</li>
              <li>✓ Have fun discovering music! 🎵</li>
            </ul>
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