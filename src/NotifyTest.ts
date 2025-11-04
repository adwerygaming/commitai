import notifier from 'node-notifier';

notifier.notify({
    title: 'CommitAI',
    message: 'This is a notification.',
    sound: true,
    wait: true,
    timeout: 5, // seconds
});
