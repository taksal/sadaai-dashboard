# 📞 Call Analytics Platform - GCP Deployment

**AI-powered call analytics with calendar integrations**

---

## 🚀 Quick Start

**Want to deploy to Google Cloud Platform?**

👉 **Follow: [START-DEPLOYMENT.md](START-DEPLOYMENT.md)**

This single guide has everything you need:
- ✅ 5-step deployment process (~45 minutes)
- ✅ Sydney, Australia region
- ✅ Complete troubleshooting
- ✅ Post-deployment configuration
- ✅ Cost estimates

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **[START-DEPLOYMENT.md](START-DEPLOYMENT.md)** | **Main deployment guide** ⭐ |
| [SECURITY-GUIDE.md](SECURITY-GUIDE.md) | Security architecture explained |
| [DEPLOYMENT-CHANGES.md](DEPLOYMENT-CHANGES.md) | Recent changes & updates |
| [VAPI_ASSISTANT_CONFIGURATION.md](VAPI_ASSISTANT_CONFIGURATION.md) | VAPI setup guide |
| [CALENDAR_INTEGRATION_GUIDE.md](CALENDAR_INTEGRATION_GUIDE.md) | Calendar integration guide |

---

## 🎯 What This Platform Does

- 📞 **AI Call Handling** - VAPI integration for intelligent call management
- 📅 **Calendar Sync** - Google Calendar & Outlook integration
- 📊 **Analytics Dashboard** - Real-time call metrics and reporting
- 👥 **Multi-Tenant** - Support multiple clients with isolated data
- 🔐 **Secure** - 2-layer security model with GCP Secret Manager

---

## 🏗️ Architecture

- **Backend:** NestJS + PostgreSQL + Redis
- **Frontend:** Next.js + React
- **Infrastructure:** Google Cloud Run (Sydney region)
- **Database:** Cloud SQL PostgreSQL
- **Cache:** Cloud Memorystore Redis
- **Security:** GCP Secret Manager + Database encryption

---

## 💰 Monthly Cost

**~$54-60/month** in Sydney region

- Scales to 0 when idle (pay only for usage)
- Perfect for small to medium traffic
- First 2M Cloud Run requests/month FREE

---

## 🔐 Security Model

**Layer 1: GCP Secret Manager** (Infrastructure)
- Session secrets
- Database credentials
- Auto-generated keys

**Layer 2: Database** (Application)
- VAPI API keys (per-user)
- OAuth credentials (per-provider)
- Calendar tokens (per-user)

See [SECURITY-GUIDE.md](SECURITY-GUIDE.md) for details.

---

## 🚀 Ready to Deploy?

1. Open **[START-DEPLOYMENT.md](START-DEPLOYMENT.md)**
2. Follow the 5 steps
3. Done in ~45 minutes!

**Region:** Australia Southeast 1 (Sydney) 🇦🇺
