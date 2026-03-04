import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <SignUp
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: "w-full",
            card: "bg-transparent border-none shadow-none w-full",
            headerTitle: "font-pixel text-3xl font-bold text-white",
            headerSubtitle: "text-zinc-400",
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case py-3',
            socialButtonsBlockButton: "bg-white text-neutral-900 hover:bg-neutral-100 border-none transition-colors",
            formFieldLabel: "text-zinc-300",
            formFieldInput: "bg-zinc-900/50 border-zinc-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500",
            footerActionLink: "text-blue-400 hover:text-blue-300",
            dividerLine: "bg-zinc-800",
            dividerText: "text-zinc-500",
          }
        }}
        signInUrl="/auth/sign-in"
        forceRedirectUrl="/dashboard?onboarding=1"
      />
    </div>
  );
}
