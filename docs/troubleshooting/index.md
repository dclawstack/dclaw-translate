# Troubleshooting

Common issues and solutions for DClaw Translate.

## Quick Diagnostics

```bash
# Check app pods
kubectl get pods -n dclaw-translate

# Check logs
kubectl logs -n dclaw-translate deployment/dclaw-translate-backend

# Check database
kubectl get clusters -n dclaw-translate
```

## Sections

- [Common Issues](./common-issues)
- [FAQ](./faq)
