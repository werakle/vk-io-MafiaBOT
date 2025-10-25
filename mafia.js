/* Всем приветик! 
Это мой сырой проект чисто для гитхаба.
Может быть вы доведете его до идеала и вам
Зайдет. В принципе работы не прям много.

Связь со мной: 
VK: https://vk.com/neckiy

С любовью, Максим Давыдов <3
*/ 
const { VK, Keyboard } = require('vk-io');

const vk = new VK({
    token: 'твой токен'
});

const ADMIN_ID = смени на айди вк;

class MafiaGame {
    constructor() {
        this.players = new Map();
        this.roles = new Map();
        this.gameState = 'waiting';
        this.dayCount = 0;
        this.votes = new Map();
        this.mafiaVotes = new Map();
        this.doctorChoice = null;
        this.sheriffChoice = null;
        this.killedTonight = null;
        this.healedTonight = null;
        this.chatId = null;
        this.phase = 'day';
        this.nightTimer = null;
        this.votingTimer = null;
        this.dayDuration = 120; // 2 минуты для дня
        this.nightDuration = 60; // 1 минута для ночи
    }

    addPlayer(userId, firstName, lastName) {
        if (this.players.has(userId)) return false;
        this.players.set(userId, { id: userId, firstName, lastName, alive: true });
        console.log(`🎮 Игрок добавлен: ${firstName} ${lastName} (${userId})`);
        return true;
    }

    removePlayer(userId) {
        if (this.players.delete(userId)) {
            this.roles.delete(userId);
            console.log(`❌ Игрок удален: ${userId}`);
            return true;
        }
        return false;
    }

    startGame(chatId, isAdminForce = false) {
        const minPlayers = isAdminForce ? 2 : 6;
        if (this.players.size < minPlayers) {
            console.log(`🚫 Недостаточно игроков: ${this.players.size}/${minPlayers}`);
            return false;
        }

        this.chatId = chatId;
        this.gameState = 'playing';
        this.dayCount = 1;
        this.phase = 'day';
        this.assignRoles(isAdminForce);
        
        console.log(`🎲 ИГРА НАЧАТА | Чат: ${chatId} | Игроков: ${this.players.size} | Режим: ${isAdminForce ? 'ADMIN_FORCE' : 'STANDARD'}`);
        console.log(`🎭 Роли:`, Array.from(this.roles.entries()));
        
        return true;
    }

    assignRoles(isAdminForce = false) {
        const playerIds = Array.from(this.players.keys());
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        this.roles.clear();

        if (isAdminForce) {
            this.assignRolesForSmallGame(shuffled);
        } else {
            this.assignRolesStandard(shuffled);
        }
    }

    assignRolesForSmallGame(shuffled) {
        const size = this.players.size;
        if (size === 2) {
            this.roles.set(shuffled[0], 'mafia');
            this.roles.set(shuffled[1], 'citizen');
        } else if (size === 3) {
            this.roles.set(shuffled[0], 'mafia');
            this.roles.set(shuffled[1], 'doctor');
            this.roles.set(shuffled[2], 'citizen');
        } else if (size === 4) {
            this.roles.set(shuffled[0], 'mafia');
            this.roles.set(shuffled[1], 'doctor');
            this.roles.set(shuffled[2], 'sheriff');
            this.roles.set(shuffled[3], 'citizen');
        } else if (size === 5) {
            this.roles.set(shuffled[0], 'mafia');
            this.roles.set(shuffled[1], 'mafia');
            this.roles.set(shuffled[2], 'doctor');
            this.roles.set(shuffled[3], 'sheriff');
            this.roles.set(shuffled[4], 'citizen');
        }
    }

    assignRolesStandard(shuffled) {
        const mafiaCount = Math.floor(this.players.size / 3);
        for (let i = 0; i < mafiaCount; i++) {
            this.roles.set(shuffled[i], 'mafia');
        }
        this.roles.set(shuffled[mafiaCount], 'doctor');
        this.roles.set(shuffled[mafiaCount + 1], 'sheriff');
        for (let i = mafiaCount + 2; i < shuffled.length; i++) {
            this.roles.set(shuffled[i], 'citizen');
        }
    }

    getRoleEmoji(role) {
        const emojis = { 'mafia': '🔫', 'doctor': '💊', 'sheriff': '👮', 'citizen': '👨‍🌾' };
        return emojis[role] || '❓';
    }

    getRoleDescription(role) {
        const descriptions = {
            'mafia': '🔫 Мафия - ночью вы убиваете горожан',
            'doctor': '💊 Доктор - ночью вы лечите одного игрока',
            'sheriff': '👮 Шериф - ночью вы проверяете игрока на мафию',
            'citizen': '👨‍🌾 Мирный житель - вычислите и повесьте мафию'
        };
        return descriptions[role] || 'Неизвестная роль';
    }

    voteForLynch(voterId, targetId) {
        if (this.phase !== 'day') {
            console.log(`🌙 Голосование днем только`);
            return false;
        }
        if (!this.players.get(voterId)?.alive || !this.players.get(targetId)?.alive) {
            console.log(`💀 Игрок мертв`);
            return false;
        }
        this.votes.set(voterId, targetId);
        console.log(`🗳️ ${voterId} → ${targetId}`);
        return true;
    }

    mafiaVote(mafiaId, targetId) {
        if (this.phase !== 'night' || this.roles.get(mafiaId) !== 'mafia') {
            console.log(`🚫 Не мафия или не ночь`);
            return false;
        }
        if (!this.players.get(targetId)?.alive) return false;
        this.mafiaVotes.set(mafiaId, targetId);
        console.log(`🔫 Мафия ${mafiaId} → ${targetId}`);
        return true;
    }

    doctorHeal(doctorId, targetId) {
        if (this.phase !== 'night' || this.roles.get(doctorId) !== 'doctor') return false;
        this.doctorChoice = targetId;
        this.healedTonight = targetId;
        console.log(`💊 Доктор ${doctorId} → ${targetId}`);
        return true;
    }

    sheriffCheck(sheriffId, targetId) {
        if (this.phase !== 'night' || this.roles.get(sheriffId) !== 'sheriff') return false;
        this.sheriffChoice = targetId;
        const isMafia = this.roles.get(targetId) === 'mafia';
        console.log(`👮 Шериф ${sheriffId} → ${targetId} = ${isMafia ? 'MAFIA' : 'CLEAN'}`);
        return isMafia;
    }

    calculateVotes() {
        const voteCount = new Map();
        for (const targetId of this.votes.values()) {
            voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
        }
        
        let maxVotes = 0;
        let lynchedPlayer = null;
        for (const [playerId, votes] of voteCount) {
            if (votes > maxVotes) {
                maxVotes = votes;
                lynchedPlayer = playerId;
            }
        }
        
        const aliveCount = this.getAlivePlayers().length;
        if (maxVotes > aliveCount / 2) {
            console.log(`💀 Повешен: ${lynchedPlayer} (${maxVotes} голосов)`);
            return lynchedPlayer;
        }
        console.log(`✅ Никто не повешен (макс: ${maxVotes})`);
        return null;
    }

    calculateMafiaVotes() {
        const voteCount = new Map();
        for (const targetId of this.mafiaVotes.values()) {
            voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
        }
        
        let maxVotes = 0;
        let killedPlayer = null;
        for (const [playerId, votes] of voteCount) {
            if (votes > maxVotes) {
                maxVotes = votes;
                killedPlayer = playerId;
            }
        }
        
        if (killedPlayer && killedPlayer !== this.healedTonight) {
            console.log(`🔪 Мафия убила: ${killedPlayer}`);
            return killedPlayer;
        }
        console.log(`🛡️ Убийство предотвращено`);
        return null;
    }

    async switchToNight() {
        this.phase = 'night';
        this.clearVotes();
        console.log(`🌙 НОЧЬ ${this.dayCount}`);
        
        await this.sendToChat(
            `🌙 Наступает ночь ${this.dayCount}!\n\n` +
            `🔫 Мафия выбирает жертву\n` +
            `💊 Доктор лечит\n` +
            `👮 Шериф проверяет\n\n` +
            `У вас ${this.nightDuration} секунд!`
        );

        this.sendNightActions();
        this.startNightTimer();
    }

    async switchToDay() {
        const killed = this.calculateMafiaVotes();
        if (killed) {
            this.killPlayer(killed);
            const killedPlayer = this.players.get(killed);
            await this.sendToChat(`💀 Ночью был убит: ${killedPlayer.firstName} ${killedPlayer.lastName}`);
        } else {
            await this.sendToChat(`✅ Этой ночью никто не погиб!`);
        }

        const winner = this.checkWinCondition();
        if (winner) {
            await this.endGame(winner);
            return;
        }

        this.phase = 'day';
        this.dayCount++;
        this.clearVotes();
        
        console.log(`☀️ ДЕНЬ ${this.dayCount}`);
        await this.sendToChat(
            `☀️ Наступает день ${this.dayCount}!\n\n` +
            `Обсуждайте и голосуйте!\n` +
            `Для голосования напишите "голос" в ЛС боту\n\n` +
            `У вас ${this.dayDuration} секунд!`
        );

        this.startDayTimer();
    }

    killPlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.alive = false;
            console.log(`💀 Убит: ${playerId}`);
            return true;
        }
        return false;
    }

    checkWinCondition() {
        const alivePlayers = this.getAlivePlayers();
        const aliveMafia = alivePlayers.filter(p => this.roles.get(p.id) === 'mafia').length;
        const aliveCitizens = alivePlayers.length - aliveMafia;

        console.log(`📊 Мафия: ${aliveMafia} vs Горожане: ${aliveCitizens}`);

        if (aliveMafia === 0) return 'citizens';
        if (aliveMafia >= aliveCitizens) return 'mafia';
        return null;
    }

    async endGame(winner) {
        this.gameState = 'finished';
        this.clearTimers();
        
        const winnerText = winner === 'citizens' ? 
            '🎉 ПОБЕДА МИРНЫХ ЖИТЕЛЕЙ! 🎉\n\nМафия побеждена!' : 
            '🎭 ПОБЕДА МАФИИ! 🎭\n\nГород пал перед мафией!';
        
        await this.sendToChat(winnerText);
        
        // Показываем все роли
        let rolesInfo = '\n🎭 Роли игроков:\n';
        for (const [playerId, role] of this.roles) {
            const player = this.players.get(playerId);
            rolesInfo += `${player.firstName} ${player.lastName} - ${this.getRoleEmoji(role)} ${role}\n`;
        }
        
        await this.sendToChat(rolesInfo);
        console.log(`🏁 Игра завершена. Победитель: ${winner}`);
    }

    getAlivePlayers() {
        return Array.from(this.players.values()).filter(p => p.alive);
    }

    getAlivePlayersForVoting(excludeId = null) {
        return this.getAlivePlayers().filter(p => p.id !== excludeId);
    }

    createVotingKeyboard(excludeId = null) {
        const players = this.getAlivePlayersForVoting(excludeId);
        if (players.length === 0) return null;

        const keyboard = Keyboard.keyboard([]);
        players.forEach((player, index) => {
            if (index % 2 === 0) keyboard.row();
            keyboard.textButton({
                label: player.firstName,
                payload: { command: 'vote', target: player.id },
                color: Keyboard.SECONDARY_COLOR
            });
        });

        keyboard.row().textButton({
            label: '❌ Отмена',
            payload: { command: 'cancel_vote' },
            color: Keyboard.NEGATIVE_COLOR
        });

        return keyboard;
    }

    createRoleKeyboard(role, excludeId = null) {
        const players = this.getAlivePlayersForVoting(excludeId);
        if (players.length === 0) return null;

        const keyboard = Keyboard.keyboard([]);
        players.forEach((player, index) => {
            if (index % 2 === 0) keyboard.row();
            keyboard.textButton({
                label: player.firstName,
                payload: { command: `${role}_action`, target: player.id },
                color: Keyboard.PRIMARY_COLOR
            });
        });

        keyboard.row().textButton({
            label: '❌ Пропустить',
            payload: { command: `skip_${role}` },
            color: Keyboard.NEGATIVE_COLOR
        });

        return keyboard;
    }

    sendNightActions() {
        for (const [playerId, role] of this.roles) {
            if (!this.players.get(playerId).alive) continue;
            
            let message = '';
            let keyboard = null;

            switch (role) {
                case 'mafia':
                    message = '🔫 Мафия, выберите цель для убийства:';
                    keyboard = this.createRoleKeyboard('mafia', playerId);
                    break;
                case 'doctor':
                    message = '💊 Доктор, выберите кого лечить:';
                    keyboard = this.createRoleKeyboard('doctor', playerId);
                    break;
                case 'sheriff':
                    message = '👮 Шериф, выберите кого проверить:';
                    keyboard = this.createRoleKeyboard('sheriff', playerId);
                    break;
            }

            if (message) {
                this.sendPrivateMessage(playerId, message, keyboard);
            }
        }
    }

    startNightTimer() {
        this.clearTimers();
        this.nightTimer = setTimeout(async () => {
            console.log(`⏰ Таймер ночи завершен`);
            await this.switchToDay();
        }, this.nightDuration * 1000);
    }

    startDayTimer() {
        this.clearTimers();
        this.votingTimer = setTimeout(async () => {
            console.log(`⏰ Таймер дня завершен`);
            await this.processDayResults();
        }, this.dayDuration * 1000);
    }

    async processDayResults() {
        const lynched = this.calculateVotes();
        if (lynched) {
            this.killPlayer(lynched);
            const lynchedPlayer = this.players.get(lynched);
            const role = this.roles.get(lynched);
            await this.sendToChat(
                `💀 По результатам голосования повешен:\n` +
                `${lynchedPlayer.firstName} ${lynchedPlayer.lastName}\n` +
                `🎭 Его роль: ${this.getRoleEmoji(role)} ${role}`
            );
        } else {
            await this.sendToChat(`✅ Никто не был повешен!`);
        }

        const winner = this.checkWinCondition();
        if (winner) {
            await this.endGame(winner);
        } else {
            await this.switchToNight();
        }
    }

    clearVotes() {
        this.votes.clear();
        this.mafiaVotes.clear();
        this.doctorChoice = null;
        this.sheriffChoice = null;
        this.killedTonight = null;
        this.healedTonight = null;
    }

    clearTimers() {
        if (this.nightTimer) clearTimeout(this.nightTimer);
        if (this.votingTimer) clearTimeout(this.votingTimer);
    }

    async sendToChat(message) {
        if (!this.chatId) return;
        try {
            await vk.api.messages.send({
                peer_id: this.chatId,
                message: message,
                random_id: Math.floor(Math.random() * 1e9)
            });
        } catch (error) {
            console.error('❌ Ошибка отправки в чат:', error);
        }
    }

    async sendPrivateMessage(userId, message, keyboard = null) {
        const params = {
            peer_id: userId,
            message: message,
            random_id: Math.floor(Math.random() * 1e9)
        };
        if (keyboard) params.keyboard = keyboard;
        
        try {
            await vk.api.messages.send(params);
        } catch (error) {
            console.error('❌ Ошибка отправки в ЛС:', error);
        }
    }
}

const game = new MafiaGame();

// Обработчик сообщений
vk.updates.on('message_new', async (context) => {
    const { text, peerId, senderId, payload, isChat } = context;
    
    try {
        const user = (await vk.api.users.get({ user_ids: [senderId] }))[0];
        
        console.log(`📨 "${text}" от ${user.first_name} ${user.last_name} (${senderId}) в ${isChat ? 'чате' : 'ЛС'}`);

        // Определяем тип сообщения
        const hasPayload = payload && Object.keys(payload).length > 0;
        const isButtonClick = hasPayload && payload.command;

        if (isButtonClick) {
            // Обработка нажатия кнопок
            await handlePayload(context, payload, user);
        } else {
            // Обработка текстовых команд
            if (isChat) {
                await handleChatCommand(context, text, senderId, peerId, user);
            } else {
                await handlePrivateCommand(context, text, senderId, user);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обработки сообщения:', error);
    }
});

async function handlePayload(context, payload, user) {
    const { command, target } = payload;
    const senderId = context.senderId;

    console.log(`🔄 Обработка кнопки: ${command}`, { target });

    switch (command) {
        case 'vote':
            if (game.voteForLynch(senderId, target)) {
                await context.send(`✅ Вы проголосовали против ${game.players.get(target).firstName}`);
            } else {
                await context.send(`❌ Не удалось проголосовать`);
            }
            break;

        case 'cancel_vote':
            game.votes.delete(senderId);
            await context.send(`🗑️ Голос отменен`);
            break;

        case 'mafia_action':
            if (game.mafiaVote(senderId, target)) {
                await context.send(`✅ Мафия выбрала цель: ${game.players.get(target).firstName}`);
            } else {
                await context.send(`❌ Не удалось выбрать цель`);
            }
            break;

        case 'doctor_action':
            if (game.doctorHeal(senderId, target)) {
                await context.send(`✅ Вы лечите: ${game.players.get(target).firstName}`);
            } else {
                await context.send(`❌ Не удалось выбрать цель для лечения`);
            }
            break;

        case 'sheriff_action':
            const isMafia = game.sheriffCheck(senderId, target);
            await context.send(`🔍 Результат проверки: ${game.players.get(target).firstName} - ${isMafia ? '🔫 МАФИЯ!' : '👨‍🌾 Мирный житель'}`);
            break;

        case 'skip_mafia':
        case 'skip_doctor':
        case 'skip_sheriff':
            await context.send(`⏭️ Действие пропущено`);
            break;
    }
}

async function handleChatCommand(context, text, senderId, peerId, user) {
    const command = text.toLowerCase().trim();

    console.log(`💬 Обработка команды в чате: ${command}`);

    switch (command) {
        case 'начать':
        case 'start':
            if (game.gameState === 'waiting') {
                game.addPlayer(senderId, user.first_name, user.last_name);
                await context.send(`🎮 ${user.first_name} присоединился! 👥 Игроков: ${game.players.size}/6\n\nДля начала игры напишите "старт"`);
            } else {
                await context.send(`❌ Игра уже идет!`);
            }
            break;

        case 'старт':
            if (game.gameState === 'waiting') {
                if (game.startGame(peerId)) {
                    await context.send(`🎲 Игра начата! 👥 Игроков: ${game.players.size}`);
                    await sendRolesToPlayers();
                    await game.sendToChat(`☀️ День 1 начинается! Обсуждайте и голосуйте!\n\nДля голосования напишите "голос" в ЛС боту`);
                    game.startDayTimer();
                } else {
                    await context.send(`❌ Недостаточно игроков! Нужно минимум 6, сейчас: ${game.players.size}`);
                }
            } else {
                await context.send(`❌ Игра уже идет!`);
            }
            break;

        case '/pofig':
            if (senderId === ADMIN_ID) {
                console.log(`⚡ Админ активировал /pofig`);
                if (game.gameState === 'waiting') {
                    if (game.startGame(peerId, true)) {
                        await context.send(`🎲 Игра начата в режиме /pofig! 👥 Игроков: ${game.players.size}`);
                        await sendRolesToPlayers();
                        await game.sendToChat(`☀️ День 1 начинается! Обсуждайте и голосуйте!`);
                        game.startDayTimer();
                    } else {
                        await context.send(`❌ Недостаточно игроков даже для /pofig!`);
                    }
                } else {
                    await context.send(`❌ Игра уже идет!`);
                }
            }
            break;

        case 'статус':
            const alivePlayers = game.getAlivePlayers();
            if (alivePlayers.length === 0) {
                await context.send(`📊 Игра не активна`);
                break;
            }
            const statusText = alivePlayers.map(p => {
                const role = game.roles.get(p.id);
                const status = p.alive ? '✅' : '💀';
                return `${status} ${p.firstName} ${game.getRoleEmoji(role)}`;
            }).join('\n');
            await context.send(`📊 Статус:\nДень: ${game.dayCount}\nФаза: ${game.phase === 'day' ? '☀️ День' : '🌙 Ночь'}\n\nИгроки:\n${statusText}`);
            break;

        case 'стоп':
            if (senderId === ADMIN_ID) {
                game.gameState = 'waiting';
                game.players.clear();
                game.roles.clear();
                game.clearTimers();
                await context.send(`🛑 Игра остановлена администратором`);
                console.log(`🛑 Игра остановлена админом ${ADMIN_ID}`);
            }
            break;

        case 'голос':
            if (game.gameState === 'playing') {
                const keyboard = game.createVotingKeyboard(senderId);
                if (keyboard) {
                    await game.sendPrivateMessage(senderId, `🗳️ Выберите игрока, против которого голосуете:`, keyboard);
                    await context.send(`📩 Клавиатура для голосования отправлена в ЛС!`);
                } else {
                    await context.send(`❌ Нет доступных игроков для голосования`);
                }
            } else {
                await context.send(`❌ Игра не активна`);
            }
            break;

        default:
            // Игнорируем обычные сообщения в чате
            break;
    }
}

async function handlePrivateCommand(context, text, senderId, user) {
    const command = text.toLowerCase().trim();

    console.log(`🔒 Обработка команды в ЛС: ${command}`);

    switch (command) {
        case 'голос':
            if (game.gameState === 'playing') {
                const keyboard = game.createVotingKeyboard(senderId);
                if (keyboard) {
                    await context.send(`🗳️ Выберите игрока, против которого голосуете:`, { keyboard });
                } else {
                    await context.send(`❌ Нет доступных игроков для голосования`);
                }
            } else {
                await context.send(`❌ Игра не активна`);
            }
            break;

        case 'роль':
            if (game.roles.has(senderId)) {
                const role = game.roles.get(senderId);
                await context.send(`🎭 Ваша роль: ${game.getRoleEmoji(role)} ${role}\n\n${game.getRoleDescription(role)}`);
            } else {
                await context.send(`❌ У вас нет роли в текущей игре`);
            }
            break;

        case 'помощь':
        case 'help':
        case 'команды':
            await context.send(getHelpMessage());
            break;

        case 'start':
        case 'начать':
            await context.send(`🎮 Чтобы присоединиться к игре, напишите "начать" в чате, где идет игра!`);
            break;

        default:
            await context.send(`❌ Неизвестная команда. Напишите "помощь" для списка команд.`);
            break;
    }
}

async function sendRolesToPlayers() {
    for (const [playerId, role] of game.roles) {
        const player = game.players.get(playerId);
        await game.sendPrivateMessage(
            playerId,
            `🎭 Ваша роль: ${game.getRoleEmoji(role)} ${role}\n\n${game.getRoleDescription(role)}\n\nИгра началась!`
        );
        console.log(`📩 Роль отправлена игроку: ${player.firstName} - ${role}`);
    }
}

function getHelpMessage() {
    return `🎮 Команды Мафии:

В ЧАТЕ:
• "начать" - присоединиться к игре
• "старт" - начать игру (6+ игроков)
• "/pofig" - начать от 2 игроков (только админ)
• "статус" - статус игры
• "голос" - получить клавиатуру для голосования

В ЛИЧНЫХ СООБЩЕНИЯХ:
• "голос" - голосовать за исключение
• "роль" - узнать свою роль
• "помощь" - это сообщение

⚡ Игра автоматически переключает фазы!
⏰ День: 2 минуты, Ночь: 1 минута`;
}

// Запуск бота
vk.updates.start().then(() => {
    console.log('🎮 Успешно запустились!');
    console.log('⚡ Разработчик: Memphis_Rains aka Максим Давыдов');
    console.log('⏰ День: 2 минуты, Ночь: 1 минута');
    console.log(`👑 Не забудьте сменить администратора. Щас он: ${ADMIN_ID}`);
    console.log('================================');
}).catch(console.error);
/* Всем приветик! 
Это мой сырой проект чисто для гитхаба.
Может быть вы доведете его до идеала и вам
Зайдет. В принципе работы не прям много.

Связь со мной: 
VK: https://vk.com/neckiy

С любовью, Максим Давыдов <3
*/ 