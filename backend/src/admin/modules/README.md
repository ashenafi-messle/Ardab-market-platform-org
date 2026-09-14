# Admin Business Modules Architecture

This directory is organized for the subsequent implementation phases of the Super Admin and Sub Admin business modules.

## Super Admin Commercial Modules
- `superadmin/products/`: Catalog, categories, SKU pricing
- `superadmin/orders/`: Order approval, lifecycle, cancellation
- `superadmin/customers/`: Customer directory and status suspension
- `superadmin/fleet/`: Vehicles, drivers, and trip assignments
- `superadmin/finance/`: Transactions and revenue metrics
- `superadmin/reports/`: Performance and sales analytics

## Sub Admin Governance & Support Modules
- `subadmin/support/`: Support tickets and resolution workflows
- `subadmin/maintenance/`: Scheduled maintenance windows and task execution
- `subadmin/security/`: Admin account management, IP rules, session revocation
- `subadmin/feedback/`: Customer feedback review and responses

Each business module will follow the standard pattern:
`routes` -> `middleware` -> `controller` -> `service` -> `Prisma`
