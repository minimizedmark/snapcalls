import { prisma } from '@/lib/prisma';
import { toCsv } from '@/lib/csv';

export async function getUserDataExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      businessSettings: true,
      messageTemplates: true,
      messageChangeTracking: true,
      messageChangeLogs: true,
      vipContacts: true,
      userFeatures: true,
      notificationSettings: true,
      wallet: true,
      walletTransactions: true,
      lowBalanceAlerts: true,
      stripeCustomer: true,
      twilioConfig: true,
      callLogs: {
        include: {
          sequences: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const { twilioConfig, stripeCustomer, ...rest } = user;

  const callLogsRows = user.callLogs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    callerNumber: log.callerNumber,
    callerName: log.callerName,
    responseType: log.responseType,
    messageSent: log.messageSent,
    smsStatus: log.smsStatus,
    isVip: log.isVip,
    isBusinessHours: log.isBusinessHours,
    hasVoicemail: log.hasVoicemail,
    voicemailUrl: log.voicemailUrl,
    voicemailTranscription: log.voicemailTranscription,
    totalCost: log.totalCost?.toString?.() ?? log.totalCost,
    twilioCallSid: log.twilioCallSid,
  }));

  const responseSequenceRows = user.callLogs.flatMap((log) =>
    log.sequences.map((seq) => ({
      callLogId: log.id,
      sequenceNumber: seq.sequenceNumber,
      scheduledAt: seq.scheduledAt.toISOString(),
      sentAt: seq.sentAt ? seq.sentAt.toISOString() : null,
      messageSent: seq.messageSent,
      status: seq.status,
    }))
  );

  const walletTransactionRows = user.walletTransactions.map((tx) => ({
    id: tx.id,
    timestamp: tx.timestamp.toISOString(),
    type: tx.type,
    amount: tx.amount?.toString?.() ?? tx.amount,
    description: tx.description,
    referenceId: tx.referenceId,
    balanceAfter: tx.balanceAfter?.toString?.() ?? tx.balanceAfter,
  }));

  const vipContactRows = user.vipContacts.map((vip) => ({
    id: vip.id,
    phoneNumber: vip.phoneNumber,
    name: vip.name,
    notes: vip.notes,
    addedDate: vip.addedDate.toISOString(),
    lastCallDate: vip.lastCallDate ? vip.lastCallDate.toISOString() : null,
    totalCalls: vip.totalCalls,
  }));

  const messageChangeLogRows = user.messageChangeLogs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    messageType: log.messageType,
    changeMethod: log.changeMethod,
    charged: log.charged,
    amount: log.amount?.toString?.() ?? log.amount,
    balanceAfter: log.balanceAfter?.toString?.() ?? log.balanceAfter,
  }));

  const lowBalanceAlertRows = user.lowBalanceAlerts.map((alert) => ({
    id: alert.id,
    alertLevel: alert.alertLevel?.toString?.() ?? alert.alertLevel,
    lastSentAt: alert.lastSentAt.toISOString(),
  }));

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      ...rest,
      twilioConfig: twilioConfig
        ? {
            phoneNumber: twilioConfig.phoneNumber,
            verified: twilioConfig.verified,
          }
        : null,
      stripeCustomer: stripeCustomer
        ? {
            stripeCustomerId: stripeCustomer.stripeCustomerId,
            paymentMethodId: stripeCustomer.paymentMethodId,
          }
        : null,
    },
    csv: {
      callLogs: toCsv(callLogsRows, [
        'id',
        'timestamp',
        'callerNumber',
        'callerName',
        'responseType',
        'messageSent',
        'smsStatus',
        'isVip',
        'isBusinessHours',
        'hasVoicemail',
        'voicemailUrl',
        'voicemailTranscription',
        'totalCost',
        'twilioCallSid',
      ]),
      responseSequences: toCsv(responseSequenceRows, [
        'callLogId',
        'sequenceNumber',
        'scheduledAt',
        'sentAt',
        'messageSent',
        'status',
      ]),
      walletTransactions: toCsv(walletTransactionRows, [
        'id',
        'timestamp',
        'type',
        'amount',
        'description',
        'referenceId',
        'balanceAfter',
      ]),
      vipContacts: toCsv(vipContactRows, [
        'id',
        'phoneNumber',
        'name',
        'notes',
        'addedDate',
        'lastCallDate',
        'totalCalls',
      ]),
      messageChangeLogs: toCsv(messageChangeLogRows, [
        'id',
        'timestamp',
        'messageType',
        'changeMethod',
        'charged',
        'amount',
        'balanceAfter',
      ]),
      lowBalanceAlerts: toCsv(lowBalanceAlertRows, [
        'id',
        'alertLevel',
        'lastSentAt',
      ]),
    },
  };
}
