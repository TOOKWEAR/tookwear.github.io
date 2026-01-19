import React, { useState } from 'react';
import { Download, FileArchive, CheckCircle2 } from 'lucide-react';

const VelocityChatPlugin = () => {
  const [downloaded, setDownloaded] = useState(false);

  const pluginFiles = {
    'pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>de.globalchat</groupId>
    <artifactId>VelocityGlobalChat</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <repositories>
        <repository>
            <id>papermc</id>
            <url>https://repo.papermc.io/repository/maven-public/</url>
        </repository>
    </repositories>

    <dependencies>
        <dependency>
            <groupId>com.velocitypowered</groupId>
            <artifactId>velocity-api</artifactId>
            <version>3.3.0-SNAPSHOT</version>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>net.luckperms</groupId>
            <artifactId>api</artifactId>
            <version>5.4</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.0</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>`,

    'src/main/java/de/globalchat/VelocityGlobalChat.java': `package de.globalchat;

import com.google.inject.Inject;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.plugin.Dependency;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.proxy.ProxyServer;
import org.slf4j.Logger;

@Plugin(
    id = "velocityglobalchat",
    name = "VelocityGlobalChat",
    version = "1.0.0",
    description = "Global Chat System mit LuckPerms Integration",
    authors = {"YourName"},
    dependencies = {@Dependency(id = "luckperms", optional = true)}
)
public class VelocityGlobalChat {
    
    private final ProxyServer server;
    private final Logger logger;
    private ChatManager chatManager;
    private TablistManager tablistManager;

    @Inject
    public VelocityGlobalChat(ProxyServer server, Logger logger) {
        this.server = server;
        this.logger = logger;
    }

    @Subscribe
    public void onProxyInitialization(ProxyInitializeEvent event) {
        chatManager = new ChatManager(server, logger);
        tablistManager = new TablistManager(server, logger);
        
        server.getEventManager().register(this, chatManager);
        server.getEventManager().register(this, tablistManager);
        
        server.getCommandManager().register("msg", new MessageCommand(chatManager));
        server.getCommandManager().register("tell", new MessageCommand(chatManager));
        server.getCommandManager().register("r", new ReplyCommand(chatManager));
        
        logger.info("VelocityGlobalChat wurde aktiviert!");
    }
}`,

    'src/main/java/de/globalchat/ChatManager.java': `package de.globalchat;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.player.PlayerChatEvent;
import com.velocitypowered.api.proxy.Player;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.RegisteredServer;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.model.user.User;
import org.slf4j.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public class ChatManager {
    
    private final ProxyServer server;
    private final Logger logger;
    private final Map<UUID, UUID> lastMessagePartner = new HashMap<>();
    
    public ChatManager(ProxyServer server, Logger logger) {
        this.server = server;
        this.logger = logger;
    }

    @Subscribe
    public void onPlayerChat(PlayerChatEvent event) {
        Player player = event.getPlayer();
        String message = event.getMessage();
        
        // Verhindere Standard-Chat
        event.setResult(PlayerChatEvent.ChatResult.denied());
        
        Optional<RegisteredServer> currentServer = player.getCurrentServer()
            .map(connection -> connection.getServer());
        
        if (!currentServer.isPresent()) {
            return;
        }
        
        // Lokaler Chat (mit +)
        if (message.startsWith("+")) {
            String localMessage = message.substring(1).trim();
            if (localMessage.isEmpty()) return;
            
            Component formattedMessage = formatMessage(player, localMessage, true);
            
            // Sende nur an Spieler auf demselben Server
            String serverName = currentServer.get().getServerInfo().getName();
            for (Player p : server.getAllPlayers()) {
                p.getCurrentServer().ifPresent(conn -> {
                    if (conn.getServerName().equals(serverName)) {
                        p.sendMessage(formattedMessage);
                    }
                });
            }
        } else {
            // Globaler Chat
            Component formattedMessage = formatMessage(player, message, false);
            
            // Sende an alle Spieler
            for (Player p : server.getAllPlayers()) {
                p.sendMessage(formattedMessage);
            }
        }
    }
    
    private Component formatMessage(Player player, String message, boolean local) {
        String prefix = getPrefix(player);
        String serverName = player.getCurrentServer()
            .map(s -> s.getServerInfo().getName())
            .orElse("Unknown");
        
        Component component = Component.empty();
        
        if (local) {
            component = component.append(Component.text("[LOCAL] ", NamedTextColor.YELLOW));
        }
        
        if (!prefix.isEmpty()) {
            component = component.append(Component.text(prefix + " ", NamedTextColor.GRAY));
        }
        
        component = component
            .append(Component.text(player.getUsername(), NamedTextColor.WHITE))
            .append(Component.text(" [" + serverName + "]", NamedTextColor.DARK_GRAY))
            .append(Component.text(": ", NamedTextColor.GRAY))
            .append(Component.text(message, NamedTextColor.WHITE));
        
        return component;
    }
    
    private String getPrefix(Player player) {
        try {
            LuckPerms luckPerms = LuckPermsProvider.get();
            User user = luckPerms.getUserManager().getUser(player.getUniqueId());
            
            if (user != null) {
                // Hole Prefix vom Lobby-Server oder global
                String prefix = user.getCachedData().getMetaData().getPrefix();
                return prefix != null ? prefix : "";
            }
        } catch (Exception e) {
            logger.warn("LuckPerms nicht verfügbar oder Fehler beim Abrufen des Prefix");
        }
        return "";
    }
    
    public void sendPrivateMessage(Player sender, Player receiver, String message) {
        String senderPrefix = getPrefix(sender);
        String receiverPrefix = getPrefix(receiver);
        
        // Nachricht für Sender
        Component senderMessage = Component.empty()
            .append(Component.text("[", NamedTextColor.GRAY))
            .append(Component.text("Du", NamedTextColor.GREEN))
            .append(Component.text(" -> ", NamedTextColor.DARK_GRAY))
            .append(Component.text(receiverPrefix, NamedTextColor.GRAY))
            .append(Component.text(receiver.getUsername(), NamedTextColor.GREEN))
            .append(Component.text("] ", NamedTextColor.GRAY))
            .append(Component.text(message, NamedTextColor.WHITE));
        
        // Nachricht für Empfänger
        Component receiverMessage = Component.empty()
            .append(Component.text("[", NamedTextColor.GRAY))
            .append(Component.text(senderPrefix, NamedTextColor.GRAY))
            .append(Component.text(sender.getUsername(), NamedTextColor.GREEN))
            .append(Component.text(" -> ", NamedTextColor.DARK_GRAY))
            .append(Component.text("Dir", NamedTextColor.GREEN))
            .append(Component.text("] ", NamedTextColor.GRAY))
            .append(Component.text(message, NamedTextColor.WHITE));
        
        sender.sendMessage(senderMessage);
        receiver.sendMessage(receiverMessage);
        
        // Speichere letzten Gesprächspartner für /r
        lastMessagePartner.put(sender.getUniqueId(), receiver.getUniqueId());
        lastMessagePartner.put(receiver.getUniqueId(), sender.getUniqueId());
    }
    
    public Optional<UUID> getLastMessagePartner(UUID playerUUID) {
        return Optional.ofNullable(lastMessagePartner.get(playerUUID));
    }
}`,

    'src/main/java/de/globalchat/MessageCommand.java': `package de.globalchat;

import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import com.mojang.brigadier.tree.LiteralCommandNode;
import com.velocitypowered.api.command.BrigadierCommand;
import com.velocitypowered.api.command.CommandSource;
import com.velocitypowered.api.proxy.Player;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;

public class MessageCommand extends BrigadierCommand {
    
    private final ChatManager chatManager;
    
    public MessageCommand(ChatManager chatManager) {
        super(createCommand(chatManager));
        this.chatManager = chatManager;
    }
    
    private static LiteralCommandNode<CommandSource> createCommand(ChatManager chatManager) {
        return LiteralArgumentBuilder.<CommandSource>literal("msg")
            .then(RequiredArgumentBuilder.<CommandSource, String>argument("player", StringArgumentType.word())
                .then(RequiredArgumentBuilder.<CommandSource, String>argument("message", StringArgumentType.greedyString())
                    .executes(context -> {
                        if (!(context.getSource() instanceof Player)) {
                            context.getSource().sendMessage(Component.text("Nur Spieler können diesen Befehl nutzen!", NamedTextColor.RED));
                            return 0;
                        }
                        
                        Player sender = (Player) context.getSource();
                        String targetName = context.getArgument("player", String.class);
                        String message = context.getArgument("message", String.class);
                        
                        Player target = sender.getServer().getServer().getPlayer(targetName).orElse(null);
                        
                        if (target == null) {
                            sender.sendMessage(Component.text("Spieler nicht gefunden!", NamedTextColor.RED));
                            return 0;
                        }
                        
                        if (target.getUniqueId().equals(sender.getUniqueId())) {
                            sender.sendMessage(Component.text("Du kannst dir nicht selbst schreiben!", NamedTextColor.RED));
                            return 0;
                        }
                        
                        chatManager.sendPrivateMessage(sender, target, message);
                        return 1;
                    })
                )
            )
            .build();
    }
}`,

    'src/main/java/de/globalchat/ReplyCommand.java': `package de.globalchat;

import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import com.mojang.brigadier.tree.LiteralCommandNode;
import com.velocitypowered.api.command.BrigadierCommand;
import com.velocitypowered.api.command.CommandSource;
import com.velocitypowered.api.proxy.Player;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;

import java.util.UUID;

public class ReplyCommand extends BrigadierCommand {
    
    private final ChatManager chatManager;
    
    public ReplyCommand(ChatManager chatManager) {
        super(createCommand(chatManager));
        this.chatManager = chatManager;
    }
    
    private static LiteralCommandNode<CommandSource> createCommand(ChatManager chatManager) {
        return LiteralArgumentBuilder.<CommandSource>literal("r")
            .then(RequiredArgumentBuilder.<CommandSource, String>argument("message", StringArgumentType.greedyString())
                .executes(context -> {
                    if (!(context.getSource() instanceof Player)) {
                        context.getSource().sendMessage(Component.text("Nur Spieler können diesen Befehl nutzen!", NamedTextColor.RED));
                        return 0;
                    }
                    
                    Player sender = (Player) context.getSource();
                    String message = context.getArgument("message", String.class);
                    
                    UUID targetUUID = chatManager.getLastMessagePartner(sender.getUniqueId()).orElse(null);
                    
                    if (targetUUID == null) {
                        sender.sendMessage(Component.text("Du hast noch keine Nachricht erhalten!", NamedTextColor.RED));
                        return 0;
                    }
                    
                    Player target = sender.getServer().getServer().getPlayer(targetUUID).orElse(null);
                    
                    if (target == null) {
                        sender.sendMessage(Component.text("Der Spieler ist nicht mehr online!", NamedTextColor.RED));
                        return 0;
                    }
                    
                    chatManager.sendPrivateMessage(sender, target, message);
                    return 1;
                })
            )
            .build();
    }
}`,

    'src/main/java/de/globalchat/TablistManager.java': `package de.globalchat;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.PostLoginEvent;
import com.velocitypowered.api.event.player.ServerConnectedEvent;
import com.velocitypowered.api.proxy.Player;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.scheduler.ScheduledTask;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.slf4j.Logger;

import java.util.concurrent.TimeUnit;

public class TablistManager {
    
    private final ProxyServer server;
    private final Logger logger;
    private ScheduledTask updateTask;
    
    public TablistManager(ProxyServer server, Logger logger) {
        this.server = server;
        this.logger = logger;
        startTablistUpdater();
    }
    
    private void startTablistUpdater() {
        updateTask = server.getScheduler()
            .buildTask(this, this::updateAllTablists)
            .repeat(1, TimeUnit.SECONDS)
            .schedule();
    }
    
    @Subscribe
    public void onPlayerJoin(PostLoginEvent event) {
        updateAllTablists();
    }
    
    @Subscribe
    public void onServerSwitch(ServerConnectedEvent event) {
        server.getScheduler()
            .buildTask(this, this::updateAllTablists)
            .delay(100, TimeUnit.MILLISECONDS)
            .schedule();
    }
    
    private void updateAllTablists() {
        for (Player player : server.getAllPlayers()) {
            updateTablist(player);
        }
    }
    
    private void updateTablist(Player player) {
        Component header = Component.text("=== Network ===", NamedTextColor.GOLD)
            .append(Component.newline())
            .append(Component.text("Spieler: " + server.getPlayerCount(), NamedTextColor.YELLOW));
        
        Component footer = Component.empty();
        
        // Zeige alle Spieler mit Server und Ping
        for (Player p : server.getAllPlayers()) {
            String serverName = p.getCurrentServer()
                .map(s -> s.getServerInfo().getName())
                .orElse("Unknown");
            
            long ping = p.getPing();
            
            NamedTextColor pingColor;
            if (ping < 50) {
                pingColor = NamedTextColor.GREEN;
            } else if (ping < 100) {
                pingColor = NamedTextColor.YELLOW;
            } else {
                pingColor = NamedTextColor.RED;
            }
            
            footer = footer.append(Component.newline())
                .append(Component.text(p.getUsername(), NamedTextColor.WHITE))
                .append(Component.text(" [" + serverName + "] ", NamedTextColor.GRAY))
                .append(Component.text(ping + "ms", pingColor));
        }
        
        player.sendPlayerListHeaderAndFooter(header, footer);
    }
}`,

    'src/main/resources/velocity-plugin.json': `{
  "id": "velocityglobalchat",
  "name": "VelocityGlobalChat",
  "version": "1.0.0",
  "description": "Global Chat System mit LuckPerms Integration",
  "authors": [
    "YourName"
  ],
  "dependencies": [
    {
      "id": "luckperms",
      "optional": true
    }
  ],
  "main": "de.globalchat.VelocityGlobalChat"
}`
  };

  const createZip = async () => {
    // Simuliere ZIP-Erstellung
    const JSZip = (await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')).default;
    const zip = new JSZip();

    // Füge alle Dateien hinzu
    Object.entries(pluginFiles).forEach(([path, content]) => {
      zip.file(path, content);
    });

    // Erstelle README
    const readme = `# Velocity Global Chat Plugin

## Features
✅ Globaler Chat über alle Server
✅ Lokaler Chat mit "+" Prefix
✅ Globale Privatnachrichten (/msg, /tell, /r)
✅ LuckPerms Prefix-Integration
✅ Tablist mit Server-Anzeige und Ping

## Installation
1. Baue das Plugin mit Maven: \`mvn clean package\`
2. Die JAR-Datei findest du in \`target/VelocityGlobalChat-1.0.0.jar\`
3. Kopiere die JAR in den \`plugins\` Ordner deines Velocity-Servers
4. Starte den Server neu

## Voraussetzungen
- Velocity 3.3.0+
- Java 17+
- LuckPerms (optional, für Prefixes)

## Verwendung
- **Globaler Chat**: Einfach normal schreiben
- **Lokaler Chat**: \`+Nachricht\` (nur auf dem aktuellen Server sichtbar)
- **Privatnachricht**: \`/msg <Spieler> <Nachricht>\` oder \`/tell <Spieler> <Nachricht>\`
- **Antworten**: \`/r <Nachricht>\`

## LuckPerms Setup
Setze Prefixes auf dem Lobby-Server oder global:
\`\`\`
/lp user <Name> meta setprefix "[VIP]"
\`\`\`

Die Prefixes werden automatisch im Chat angezeigt.

## Support
Bei Problemen oder Fragen erstelle ein Issue auf GitHub.
`;

    zip.file('README.md', readme);

    // Generiere ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VelocityGlobalChat-Source.zip';
    a.click();
    URL.revokeObjectURL(url);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <FileArchive className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white mb-2">Velocity Global Chat Plugin</h1>
            <p className="text-gray-300">Vollständiges Chat-System mit allen Features</p>
          </div>

          <div className="bg-black/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">📋 Features</h2>
            <ul className="space-y-2 text-gray-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Globaler Chat über alle Server
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Lokaler Chat mit "+" Prefix
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Globale Privatnachrichten (/msg, /tell, /r)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                LuckPerms Prefix-Integration vom Lobby-Server
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Tablist mit Server-Anzeige und Ping (farbcodiert)
              </li>
            </ul>
          </div>

          <div className="bg-black/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">🛠️ Installation</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-200">
              <li>ZIP-Datei herunterladen und entpacken</li>
              <li>In das Projektverzeichnis navigieren</li>
              <li>Mit Maven bauen: <code className="bg-black/50 px-2 py-1 rounded">mvn clean package</code></li>
              <li>JAR-Datei aus <code className="bg-black/50 px-2 py-1 rounded">target/</code> in den Velocity <code className="bg-black/50 px-2 py-1 rounded">plugins/</code> Ordner kopieren</li>
              <li>Server neustarten</li>
            </ol>
          </div>

          <div className="bg-black/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">💡 Verwendung</h2>
            <div className="space-y-3 text-gray-200">
              <div>
                <strong className="text-yellow-400">Globaler Chat:</strong>
                <p className="ml-4">Einfach normal schreiben - alle Spieler auf allen Servern sehen die Nachricht</p>
              </div>
              <div>
                <strong className="text-yellow-400">Lokaler Chat:</strong>
                <p className="ml-4"><code className="bg-black/50 px-2 py-1 rounded">+Deine Nachricht</code> - nur Spieler auf dem gleichen Server sehen es</p>
              </div>
              <div>
                <strong className="text-yellow-400">Privatnachricht:</strong>
                <p className="ml-4"><code className="bg-black/50 px-2 py-1 rounded">/msg Spieler Nachricht</code> oder <code className="bg-black/50 px-2 py-1 rounded">/tell Spieler Nachricht</code></p>
              </div>
              <div>
                <strong className="text-yellow-400">Antworten:</strong>
                <p className="ml-4"><code className="bg-black/50 px-2 py-1 rounded">/r Nachricht</code> - antwortet dem letzten Absender</p>
              </div>
            </div>
          </div>

          <button
            onClick={createZip}
            disabled={downloaded}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:scale-100"
          >
            {downloaded ? (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Download erfolgreich!
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                VelocityGlobalChat-Source.zip herunterladen
              </>
            )}
          </button>

          <div className="mt-6 text-center text-gray-300 text-sm">
            <p>Benötigt: Velocity 3.3.0+, Java 17+, Maven</p>
            <p className="mt-2">LuckPerms ist optional für Prefix-Anzeige</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VelocityChatPlugin;
