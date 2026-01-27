// NAME: All Of Artist
// AUTHOR: pl4neta
// DESCRIPTION: Create a playlist with all songs of an artist

interface AllOfArtistConfig {
    [key: string]: string | boolean;
    addFeatures: boolean;
    addCompilations: boolean;
    trackPriority: "trackCount" | "oldest"; // extend if you add options
    removeDupes: boolean;
    removeDupesConfirm: boolean;
    sortOrder: "oldest" | "newest" | "type";
    inAppNotification: "subtle" | "popup";
}

interface ArtistData {
    id: string;
    name: string;
}

interface TrackHistoryItem {
    name: string;
    uri: string;
    trackCount: number;
    type: string;
    index: string;
    isrc: string;
}

type ArtistAlbum = {
    id: string;
    name: string;
    date: string;
    albumType: string;
};

(async function allOfArtist(): Promise<void> {
    if (!(Spicetify.GraphQL && Spicetify.LocalStorage)) {
        setTimeout(allOfArtist, 300);
        return;
    }

    const { GraphQL, URI } = Spicetify;

    const defaultConfig: AllOfArtistConfig = {
        addFeatures: true,
        addCompilations: true,
        trackPriority: "trackCount",
        removeDupes: true,
        removeDupesConfirm: false,
        sortOrder: "oldest",
        inAppNotification: "subtle",
    };

    function getConfig(): AllOfArtistConfig {
        try {
            const raw = Spicetify.LocalStorage.get("allOfArtist:settings");
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === "object") {
                return parsed as AllOfArtistConfig;
            }
            throw new Error("Invalid config");
        } catch {
            Spicetify.LocalStorage.set(
                "allOfArtist:settings",
                JSON.stringify(defaultConfig),
            );
            return defaultConfig;
        }
    }

    const CONFIG: AllOfArtistConfig = getConfig();

    function saveConfig(): void {
        Spicetify.LocalStorage.set(
            "allOfArtist:settings",
            JSON.stringify(CONFIG),
        );
    }

    function resetConfig(): void {
        Spicetify.LocalStorage.set(
            "allOfArtist:settings",
            JSON.stringify(defaultConfig),
        );
    }

    const content: HTMLDivElement = document.createElement("div");

    function styleSettings(): void {
        const style = document.createElement("style");
        style.innerHTML = `
    .setting-row::after {
      content: "";
      display: table;
      clear: both;
    }
    .setting-row {
      display: flex;
      padding: 10px 0;
      align-items: center;
      justify-content: space-between;
    }
    .setting-row .col.description {
      float: left;
      padding-right: 15px;
      width: 100%;
    }
    .setting-row .col.action {
      float: right;
      text-align: right;
    }
    button.switch {
      align-items: center;
      border: 0px;
      border-radius: 50%;
      background-color: rgba(var(--spice-rgb-shadow), .7);
      color: var(--spice-text);
      cursor: pointer;
      display: flex;
      margin-inline-start: 12px;
      padding: 8px;
    }
    button.switch.disabled,
    button.switch[disabled] {
      color: rgba(var(--spice-rgb-text), .3);
    }
    select {
      color: var(--spice-text);
      background: rgba(var(--spice-rgb-shadow), 0.7);
      border: 0;
      height: 32px;
    }
    `;
        content.appendChild(style);
    }

    function header(title: string): HTMLHeadingElement {
        const container = document.createElement("h2");
        container.innerText = title;
        return container;
    }

    function checkButton(
        name: keyof AllOfArtistConfig,
        desc: string,
        attributes: string,
    ): HTMLDivElement {
        const val = CONFIG[name];
        const container = document.createElement("div");
        container.classList.add("setting-row");
        container.innerHTML = `
      <label class="col description">${desc}</label>
      <div class="col action">
        <button class="switch" ${attributes}>
          <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">${Spicetify.SVGIcons.check}</svg>
        </button>
      </div>
    `;
        const button = container.querySelector<HTMLButtonElement>("button.switch");
        if (!button) {
            return container;
        }

        button.classList.toggle("disabled", !Boolean(val));
        button.onclick = () => {
            const state = button.classList.contains("disabled");
            button.classList.toggle("disabled");
            CONFIG[name] = state;
            saveConfig();
        };
        return container;
    }

    function dropDown(
        name: keyof AllOfArtistConfig,
        desc: string,
        options: Record<string, string>,
        attributes: string,
    ): HTMLDivElement {
        const val = Object.keys(options).indexOf(String(CONFIG[name]));
        const container = document.createElement("div");
        container.classList.add("setting-row");

        let optionsHTML = "";
        for (const [key, value] of Object.entries(options)) {
            optionsHTML += `<option value="${key}">${value}</option>`;
        }

        container.innerHTML = `
      <label class="col description">${desc}</label>
      <div class="col action">
        <select ${attributes}>
          ${optionsHTML}
        </select>
      </div>
    `;

        const select = container.querySelector<HTMLSelectElement>("select");
        if (!select) {
            return container;
        }

        select.selectedIndex = val;
        select.onchange = () => {
            const keys = Object.keys(options);
            CONFIG[name] = keys[select.selectedIndex];
            saveConfig();
        };
        return container;
    }

    function settingsContent(): void {
        content.appendChild(header("Inclusion"));
        content.appendChild(checkButton("addFeatures", "Include Features", ""));
        content.appendChild(
            checkButton("addCompilations", "Include Compilations", ""),
        );

        content.appendChild(header("Dupes"));
        content.appendChild(
            checkButton("removeDupes", "Automatically Remove Dupes", ""),
        );
        content.appendChild(
            checkButton(
                "removeDupesConfirm",
                "Confirm Choices (Coming Soon!)",
                "disabled",
            ),
        );
        content.appendChild(
            dropDown(
                "trackPriority",
                "Track Priority (Experimental!)",
                {
                    trackCount: "Album's Track Count",
                    oldest: "Oldest Releases",
                    // newest: "Newest Releases"
                },
                "",
            ),
        );

        content.appendChild(header("Sorting"));
        content.appendChild(
            dropDown(
                "sortOrder",
                "Sort Order (Coming Soon!)",
                {
                    oldest: "Oldest to Newest",
                    newest: "Newest to Oldest",
                    type: "Albums -> EPs -> Singles",
                },
                "disabled",
            ),
        );

        content.appendChild(header("Feedback"));
        content.appendChild(
            dropDown(
                "inAppNotification",
                "Notification",
                { subtle: "Subtle", popup: "Popup" },
                "",
            ),
        );
    }

    styleSettings();
    settingsContent();

    async function getArtist(uris: string[]): Promise<ArtistData> {
        const uri = uris[0].split(":");
        const type = uri[1];
        const id = uri[2];

        const artistData: ArtistData = { id: "ERROR", name: "ERROR" };

        if (type === "artist") {
            const res: any = await GraphQL.Request(
                GraphQL.Definitions.getArtistNameAndTracks,
                { id }
            );
            // Response structure may differ, adapt as necessary
            if (res && res.artistUnion && res.artistUnion.name && res.artistUnion.id) {
                artistData.id = res.artistUnion.id;
                artistData.name = res.artistUnion.name;
            }
        } else if (type === "album") {
            const res: any = await GraphQL.Request(
                GraphQL.Definitions.getAlbumNameAndTracks,
                { id }
            );
            // Highly likely the response has an 'album' property with artist info
            if (res && res.album && res.album.artists && res.album.artists[0]) {
                artistData.id = res.album.artists[0].id;
                artistData.name = res.album.artists[0].name;
            }
        } else if (type === "track") {
            const res: any = await GraphQL.Request(
                GraphQL.Definitions.getTrack,
                { id }
            );
            // Assuming 'track' field has artists list
            if (res && res.track && res.track.artists && res.track.artists[0]) {
                artistData.id = res.track.artists[0].id;
                artistData.name = res.track.artists[0].name;
            }
        }

        return artistData;
    }

    function createAllOf(uris: string[]): void {
        void makePlaylist_getTracks(uris);
    }

    async function getArtistDiscography(artistId: string): Promise<ArtistAlbum[]> {
        const discog: ArtistAlbum[] = [];
        const seenAlbumIds = new Set<string>();
        let offset = 0;
        let hasNextPage = true;
        const artistAlbumQuery = GraphQL.Definitions.queryArtistDiscographyAll;

        while (hasNextPage) {
            try {
                const response: any = await GraphQL.Request(artistAlbumQuery, {
                    uri: `spotify:artist:${artistId}`,
                    offset,
                    limit: 50,
                });

                const items =
                    response?.data?.artistUnion?.discography?.all?.items ??
                    response?.artistUnion?.discography?.all?.items ??
                    [];

                if (!items || items.length === 0) break;

                for (const item of items) {
                    const releases = item.releases?.items || [];
                    for (const release of releases) {
                        if (!release?.id || seenAlbumIds.has(release.id)) {
                            continue;
                        }
                        discog.push({
                            id: release.id,
                            name: release.name,
                            date:
                                release.date?.isoString ||
                                release.date?.year?.toString() ||
                                "",
                            albumType: release.type || "album",
                        });
                        seenAlbumIds.add(release.id);
                    }
                }

                offset += 50;
                hasNextPage = items.length === 50;
            } catch (error) {
                // Fallback to current partial discography if GraphQL fails
                console.error("[AllOfArtist][ERROR] GraphQL artist discography failed:", error);
                break;
            }
        }

        discog.sort((a, b) => a.date.localeCompare(b.date));
        return discog;
    }

    async function createPlaylistForArtist(
        userId: string,
        artistName: string,
        description: string,
    ): Promise<{ id: string; uri?: string }> {
        const playlistName = `All Of ${artistName}`;
        const platform: any = (Spicetify as any).Platform;

        // Prefer modern PlaylistAPI if available
        const playlistApi = platform?.PlaylistAPI;
        if (playlistApi?.create) {
            const created = await playlistApi.create(playlistName, {
                description,
                public: false,
                collaborative: false,
            });

            const createdUri: string | undefined = created?.uri;
            const createdId: string =
                created?.id ?? (createdUri ? createdUri.split(":").pop() : undefined);

            if (!createdId) {
                throw new Error("Failed to create playlist: missing id");
            }

            return { id: createdId, uri: createdUri };
        }

        // Fallback: try RootlistAPI if exposed
        const rootlistApi = platform?.RootlistAPI;
        if (rootlistApi?.createPlaylist) {
            const created = await rootlistApi.createPlaylist(playlistName, {
                description,
                public: false,
                collaborative: false,
            });

            const createdUri: string | undefined = created?.uri;
            const createdId: string =
                created?.id ?? (createdUri ? createdUri.split(":").pop() : undefined);

            if (!createdId) {
                throw new Error("Failed to create playlist via RootlistAPI: missing id");
            }

            return { id: createdId, uri: createdUri };
        }

        throw new Error("No supported playlist creation API available");
    }

    async function updatePlaylistMetadata(
        playlistIdOrUri: string,
        metadata: { name?: string; description?: string },
    ): Promise<void> {
        const platform: any = (Spicetify as any).Platform;
        const playlistApi = platform?.PlaylistAPI;

        // Accept either raw id or full URI
        const playlistUri = playlistIdOrUri.startsWith("spotify:playlist:")
            ? playlistIdOrUri
            : `spotify:playlist:${playlistIdOrUri}`;

        if (playlistApi?.update) {
            try {
                await playlistApi.update(playlistUri, metadata);
                return;
            } catch (error) {
                console.warn(
                    "[AllOfArtist][WARN] PlaylistAPI.update failed, metadata may be stale:",
                    error,
                );
                return;
            }
        }

        // If no update API, fail silently – description is non-critical
        console.warn(
            "[AllOfArtist][WARN] No PlaylistAPI.update available; skipping playlist metadata update",
        );
    }

    async function makePlaylist_getTracks(uris: string[]): Promise<void> {
        const artistData = await getArtist(uris);
        const user: any = await GraphQL.Request(
            GraphQL.Definitions.me,
        );
        if (artistData.id !== "ERROR") {
            const discography = await getArtistDiscography(artistData.id);
            const artistAlbums: [string, string, string][] = [];

            for (const album of discography) {
                if (!CONFIG["addCompilations"] && album.albumType === "compilation") {
                    continue;
                }

                let tempDate: string = album.date.replace(/-/g, "");
                while (tempDate.length < 8) {
                    tempDate += "0";
                }

                artistAlbums.push([tempDate, album.id, album.albumType]);
            }

            artistAlbums.sort();

            const newPlaylist = await createPlaylistForArtist(
                user.id,
                artistData.name,
                `Creating All Of ${artistData.name}...`,
            );

            await addFromAlbums(newPlaylist.id, artistData, artistAlbums, user);

            if (CONFIG["inAppNotification"] === "subtle") {
                Spicetify.showNotification(`All Of ${artistData.name} created.`);
            } else if (CONFIG["inAppNotification"] === "popup") {
                Spicetify.PopupModal.display({
                    title: "All Of Artist",
                    content: `All Of ${artistData.name} created.`,
                });
            }

            await updatePlaylistMetadata(newPlaylist.id, {
                description: `Playlist with all ${artistData.name} songs, generated by pl4neta's extenstion allOfArtist`,
            });
        } else {
            Spicetify.showNotification(
                `ERROR creating All Of ${artistData.name}`,
                true,
            );
        }
    }

    async function getIndexFrom2dArray(
        array: TrackHistoryItem[],
        key: string,
    ): Promise<number> {
        for (let i = 0; i < array.length; i++) {
            if (array[i].isrc === key) {
                return i;
            }
        }
        return -1;
    }

    async function addTracks(
        playlistId: string,
        playlists: string[][],
        artistData: ArtistData,
        user: any,
    ): Promise<void> {
        const platform: any = (Spicetify as any).Platform;
        const playlistApi = platform?.PlaylistAPI;

        if (!playlistApi?.add) {
            console.error("[AllOfArtist][ERROR] PlaylistAPI.add is not available");
            return;
        }

        const mainPlaylistUri = `spotify:playlist:${playlistId}`;

        // Add first chunk of tracks to the primary playlist
        if (playlists[0] && playlists[0].length > 0) {
            await playlistApi.add(mainPlaylistUri, playlists[0], { after: "end" });
        }

        if (playlists.length > 1) {
            await updatePlaylistMetadata(playlistId, {
                name: `All Of ${artistData.name} 1/${playlists.length}`,
            });

            for (let i = 1; i < playlists.length; i++) {
                const newPlaylist = await createPlaylistForArtist(
                    user.id,
                    `${artistData.name} ${i + 1}/${playlists.length}`,
                    `Playlist with all ${artistData.name} songs, generated by pl4neta's extenstion allOfArtist`,
                );

                const newPlaylistUri = newPlaylist.uri
                    ? newPlaylist.uri
                    : `spotify:playlist:${newPlaylist.id}`;

                if (playlists[i] && playlists[i].length > 0) {
                    await playlistApi.add(newPlaylistUri, playlists[i], { after: "end" });
                }
            }
        }
    }

    async function addFromAlbums(
        playlistId: string,
        artistData: ArtistData,
        array: [string, string, string][],
        user: any,
    ): Promise<void> {
        const track_history: TrackHistoryItem[] = [];
        const tracksAdd: string[][] = [];

        let albumTracksAdd: string[] = [];

        const albumTrackQuery = GraphQL.Definitions.queryAlbumTracks;

        for (const [, albumId, albumType] of array) {
            let offset = 0;
            const limit = 100;
            let hasNextPage = true;

            while (hasNextPage) {
                const response: any = await GraphQL.Request(albumTrackQuery, {
                    uri: `spotify:album:${albumId}`,
                    offset,
                    limit,
                });

                const items =
                    response?.data?.albumUnion?.tracksV2?.items ||
                    response?.data?.albumUnion?.tracks?.items ||
                    response?.albumUnion?.tracksV2?.items ||
                    response?.albumUnion?.tracks?.items ||
                    [];

                if (!items || items.length === 0) break;

                const totalTracks = items.length;

                for (let i = 0; i < items.length; i++) {
                    const raw = items[i];
                    const track = raw.track ?? raw;

                    if (!track) {
                        continue;
                    }

                    const trackUri: string | undefined = track.uri;
                    const trackId: string | undefined =
                        track.id ?? (trackUri ? trackUri.split(":").pop() : undefined);

                    if (!trackId || !trackUri) {
                        continue;
                    }

                    const mainArtistId: string | undefined =
                        track.artists?.[0]?.id ?? track.artist?.id;

                    if (!CONFIG["addFeatures"] && mainArtistId !== artistData.id) {
                        continue;
                    }

                    const track_artists: string[] = [];
                    const artistsArray = track.artists ?? track.artist?.items ?? [];

                    for (let c = 0; c < artistsArray.length; c++) {
                        const artistId: string | undefined =
                            artistsArray[c]?.id ?? artistsArray[c]?.uri?.split(":").pop();
                        if (artistId) {
                            track_artists.push(artistId);
                        }
                    }

                    if (track_artists.includes(artistData.id)) {
                        if (CONFIG["removeDupes"]) {
                            const trackInfo: TrackHistoryItem = {
                                name: track.name,
                                uri: trackUri,
                                trackCount: totalTracks,
                                type: albumType,
                                index: `${tracksAdd.length}_${albumTracksAdd.length}`,
                                // GraphQL track responses may not expose ISRC directly;
                                // fall back to using the track URI as a stable identifier.
                                isrc: track.external_ids?.isrc ?? trackUri,
                            };

                            const playlist_tracks_index = await getIndexFrom2dArray(
                                track_history,
                                trackInfo.isrc,
                            );

                            if (playlist_tracks_index >= 0) {
                                if (
                                    CONFIG["trackPriority"] === "trackCount" &&
                                    albumType !== "compilation" &&
                                    (track_history[playlist_tracks_index].type ===
                                        "compilation" ||
                                        (track_history[playlist_tracks_index].type !==
                                            "compilation" &&
                                            totalTracks >
                                                track_history[playlist_tracks_index].trackCount))
                                ) {
                                    const removeIndex =
                                        track_history[playlist_tracks_index].index.split("_");
                                    track_history.splice(playlist_tracks_index, 1, {} as any);

                                    const index0 = Number(removeIndex[0]);
                                    const index1 = Number(removeIndex[1]);

                                    if (tracksAdd.length > index0) {
                                        tracksAdd[index0].splice(index1, 1, "remove");
                                    } else {
                                        albumTracksAdd.splice(index1, 1, "remove");
                                    }

                                    track_history.push(trackInfo);
                                    albumTracksAdd.push(trackInfo.uri);
                                }
                            } else {
                                track_history.push(trackInfo);
                                albumTracksAdd.push(trackInfo.uri);
                            }
                        } else {
                            albumTracksAdd.push(trackUri);
                        }

                        if (albumTracksAdd.length === 100) {
                            tracksAdd.push(albumTracksAdd);
                            albumTracksAdd = [];
                        }
                    }
                }

                hasNextPage = items.length === limit;
                offset += limit;
            }
        }

        if (albumTracksAdd.length > 0) {
            tracksAdd.push(albumTracksAdd);
        }

        for (let i = 0; i < tracksAdd.length; i++) {
            for (let r = tracksAdd[i].length - 1; r >= 0; r--) {
                if (tracksAdd[i][r] === "remove") {
                    tracksAdd[i].splice(r, 1);
                }
            }
        }

        const playlists: string[][] = [];
        while (tracksAdd.length > 0) {
            const chunk = tracksAdd.slice(0, 100);
            const flattened: string[] = ([] as string[]).concat(...chunk);
            playlists.push(flattened);
            tracksAdd.splice(0, 100);
        }

        await addTracks(playlistId, playlists, artistData, user);
    }

    function shouldDisplayContextMenu(uris: string[]): boolean {
        if (uris.length > 1) {
            return false;
        }
        const uri = uris[0];
        const uriObj = Spicetify.URI.fromString(uri);
        if (
            uriObj.type === Spicetify.URI.Type.TRACK ||
            uriObj.type === Spicetify.URI.Type.ARTIST ||
            uriObj.type === Spicetify.URI.Type.ALBUM
        ) {
            return true;
        }
        return false;
    }

    new Spicetify.Menu.Item(
        "All Of Artist",
        false,
        () => {
            Spicetify.PopupModal.display({
                title: "All Of Artist Settings",
                content,
                isLarge: true,
            });
        },
        "artist",
    ).register();

    const cntxMenu = new Spicetify.ContextMenu.Item(
        "Create All Of Artist",
        createAllOf,
        shouldDisplayContextMenu,
        "artist",
    );
    cntxMenu.register();
})();