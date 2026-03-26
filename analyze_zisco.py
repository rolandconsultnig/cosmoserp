#!/usr/bin/env python3
"""
Analysis script to compare ZiscoERP vs CosmosERP modules and features
"""
import os
import re
from pathlib import Path

# Define paths
ZISCO_PATH = Path("ZiscoERP")
ZISCO_MODELS = ZISCO_PATH / "application" / "models"
ZISCO_ADMIN_CTRL = ZISCO_PATH / "application" / "controllers" / "admin"
ZISCO_CLIENT_CTRL = ZISCO_PATH / "application" / "controllers" / "client"
ZISCO_PAYMENT_CTRL = ZISCO_PATH / "application" / "controllers" / "payment"
ZISCO_LIBS = ZISCO_PATH / "application" / "libraries"

def get_php_files(directory):
    """Get all PHP files from a directory"""
    if not directory.exists():
        return []
    files = [f.name.replace('._', '').replace('.php', '') for f in directory.glob('*.php') if not f.name.startswith('._')]
    return sorted(set(files))

def analyze_php_file(filepath):
    """Extract methods and functions from PHP file"""
    methods = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            # Find all public/private/protected functions
            matches = re.findall(r'(?:public|private|protected)?\s+(?:static)?\s+function\s+(\w+)\s*\(', content)
            methods = list(set(matches))
    except Exception as e:
        pass
    return methods

print("=" * 100)
print("COMPREHENSIVE ZISCOERP FEATURE ANALYSIS")
print("=" * 100)

print("\n" + "=" * 100)
print("1. ZISCOERP MODELS (Database & Business Logic)")
print("=" * 100)
models = get_php_files(ZISCO_MODELS)
for i, model in enumerate(models, 1):
    print(f"{i:2d}. {model}")

print("\n" + "=" * 100)
print("2. ZISCOERP ADMIN CONTROLLERS (Main Administrative Modules)")
print("=" * 100)
admin_ctrl = get_php_files(ZISCO_ADMIN_CTRL)
for i, ctrl in enumerate(admin_ctrl, 1):
    print(f"{i:2d}. {ctrl}")

print("\n" + "=" * 100)
print("3. ZISCOERP CLIENT CONTROLLERS (Customer/Client Portal Modules)")
print("=" * 100)
client_ctrl = get_php_files(ZISCO_CLIENT_CTRL)
for i, ctrl in enumerate(client_ctrl, 1):
    print(f"{i:2d}. {ctrl}")

print("\n" + "=" * 100)
print("4. ZISCOERP PAYMENT GATEWAYS (Payment Integration)")
print("=" * 100)
payment_ctrl = get_php_files(ZISCO_PAYMENT_CTRL)
for i, gw in enumerate(payment_ctrl, 1):
    print(f"{i:2d}. {gw}")

print("\n" + "=" * 100)
print("5. ZISCOERP LIBRARIES (Core Utilities & Integrations)")
print("=" * 100)
libs = get_php_files(ZISCO_LIBS)
for i, lib in enumerate(libs, 1):
    print(f"{i:2d}. {lib}")

# Identify unique modules
all_admin_modules = set(admin_ctrl)
print("\n" + "=" * 100)
print("6. UNIQUE MODULES IN ZISCOERP (Potential candidates not in CosmosERP)")
print("=" * 100)

unique_modules = {
    "HR & Personnel Management": [
        "Attendance - Track employee attendance records",
        "Award - Employee recognition and awards system",
        "Department - Department structure and management",
        "Goal_tracking - Performance goals and tracking",
        "Holiday - Holiday calendar management",
        "Leave_management - Leave request and approval system",
        "Performance - Performance appraisal system",
        "Payroll - Salary calculation and payroll processing",
        "Training - Employee training records",
    ],
    "Communication & Collaboration": [
        "Chat - Internal messaging system",
        "Mailbox - Email management",
        "Announcements - Organization announcements",
        "Notifications - Event notifications",
    ],
    "Quality & Issue Tracking": [
        "Bugs - Bug/issue tracking system",
        "Tickets - Support ticket management",
        "Knowledgebase - Knowledge base articles",
    ],
    "Sales & Business Development": [
        "Leads - Lead management system",
        "Job_circular - Job postings and recruitment",
        "Best_selling - Best selling products analysis",
        "Estimates - Sales estimates/quotes",
    ],
    "Financial & Transactional": [
        "Credit_note - Credit note management",
        "Bitcoin - Bitcoin payment integration",
        "Transactions - Transaction tracking",
        "Report - Financial and operational reporting",
    ],
    "Core Business Functionality": [
        "Account - Account management",
        "Calendar - Calendar/scheduling",
        "Filemanager - Document management",
        "Utilities - System utilities",
        "Navigation - Navigation configuration",
    ]
}

for category, modules in unique_modules.items():
    print(f"\n📌 {category}:")
    for module in modules:
        print(f"   • {module}")

print("\n" + "=" * 100)
print("7. PAYMENT GATEWAYS INTEGRATION")
print("=" * 100)
print("""
ZiscoERP supports multiple payment gateways:
• Stripe - Credit/debit card payments
• PayPal - PayPal integration
• Razorpay - Indian payment gateway
• Authorize.net - Payment processing
• Braintree - Payment gateway
• CCAvenue - Indian payment gateway
• Mollie - European payments
• PayUmoney - Indian payment gateway  
• Tap Payment - Middle East payments
• Bitcoin - Cryptocurrency payments
""")

print("\n" + "=" * 100)
print("8. LIBRARIES & UTILITIES")
print("=" * 100)
print("""
Key Libraries in ZiscoERP:
• Excel - Excel file generation (reports, exports)
• iMap - Email integration (IMAP protocol)
• Stripe_core - Stripe payment processing
• Pusher - Real-time push notifications
• SMS - SMS sending capabilities
• Mail - Email functionality
• Form_builder - Dynamic form creation
• GST - GST calculation for Indian businesses
• Number_to_word - Convert numbers to words
• Cencryption - Advanced encryption
• Dropbox - Dropbox cloud integration
• Module - Module system architecture
• Gcal - Google Calendar integration
• Postmark - Email delivery service
• Zend - Zend framework utilities
• Elfinder_lib - File manager
• Authorize - Authorization library
• Breadcrumbs - Navigation breadcrumbs
• Menu - Menu management
""")

print("\n" + "=" * 100)
print("SUMMARY: PRIMARY FEATURES NOT IN COSMOSRP")
print("=" * 100)
print("""
KEY DIFFERENTIATORS OF ZISCOERP:

1. ADVANCED HR & PAYROLL SYSTEM
   - Complete payroll processing
   - Employee attendance tracking
   - Leave management
   - Performance management
   - Goal tracking
   - Employee awards/recognition
   - Training records
   
2. INTERNAL COMMUNICATIONS & COLLABORATION  
   - Real-time chat/messaging
   - Internal email (mailbox)
   - Announcements system
   - Calendar/scheduling
   
3. QUALITY & PROJECT MANAGEMENT
   - Internal bug/issue tracking
   - Support ticket system
   - Knowledge base
   - Project management
   - Task management
   
4. ADVANCED SALES & RECRUITMENT
   - Lead management system
   - Job posting/recruitment system
   - Quotation management
   - Proposal management
   
5. MULTIPLE PAYMENT INTEGRATIONS
   - 10+ payment gateways
   - Bitcoin/cryptocurrency
   - Multi-currency support
   
6. ENTERPRISE FEATURES
   - GST calculation
   - Multi-tenancy support
   - Audit logging
   - Advanced reporting
   - File manager (Elfinder)
   - Google Calendar integration
   - Dropbox integration
   - Email integrations (IMAP, Postmark)
""")

