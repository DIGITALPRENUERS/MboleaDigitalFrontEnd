# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - link "Mbolea Digital" [ref=e5] [cursor=pointer]:
      - /url: /
      - img [ref=e6]
      - generic [ref=e9]: Mbolea Digital
    - heading "Sign in" [level=1] [ref=e10]
    - paragraph [ref=e11]: Use your email and password to continue.
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]: Email
        - textbox "you@example.com" [ref=e16]
      - generic [ref=e17]:
        - generic [ref=e18]: Password
        - generic [ref=e19]:
          - textbox "••••••••" [ref=e20]
          - button "Show password" [ref=e21]:
            - img [ref=e22]
      - button "Sign in" [ref=e25]
    - paragraph [ref=e26]:
      - text: Don't have an account?
      - link "Sign up" [ref=e27] [cursor=pointer]:
        - /url: /signup
  - generic "Notifications"
```