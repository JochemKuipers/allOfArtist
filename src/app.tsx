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
        const val = CONFIG[name] as number;
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

    async function makePlaylist_getTracks(uris: string[]): Promise<void> {
        const artistData = await getArtist(uris);
        const user: any = await GraphQL.Request(
            GraphQL.Definitions.me,
        );
        if (artistData.id !== "ERROR") {
            let artistAlbumsRaw: any = await GraphQL.Request(
                GraphQL.Definitions.getArtistAlbums,
                { id: artistData.id, includeGroups: ["album", "single", "appears_on"], limit: 50, offset: 0 }
            );
            const total: number = artistAlbumsRaw.total;
            const artistAlbums: [string, string, string][] = [];

            while (artistAlbums.length <= total) {
                for (let i = 0; i < artistAlbumsRaw.items.length; i++) {
                    if (
                        !(
                            !CONFIG["addCompilations"] &&
                            artistAlbumsRaw.items[i].album_type === "compilation"
                        )
                    ) {
                        let tempDate: string = artistAlbumsRaw.items[i].release_date.replace(
                            /-/g,
                            "",
                        );
                        while (tempDate.length < 8) {
                            tempDate += "0";
                        }
                        artistAlbums.push([
                            tempDate,
                            artistAlbumsRaw.items[i].id,
                            artistAlbumsRaw.items[i].album_type,
                        ]);
                    }
                }
                if (artistAlbumsRaw.next != null) {
                    artistAlbumsRaw = await CosmosAsync.get(artistAlbumsRaw.next);
                } else {
                    break;
                }
            }

            artistAlbums.sort();

            const newPlaylist: any = await CosmosAsync.post(
                `https://api.spotify.com/v1/users/${user.id}/playlists`,
                {
                    name: `All Of ${artistData.name}`,
                    description: `Creating All Of ${artistData.name}...`,
                    public: false,
                    collaborative: false,
                },
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

            await CosmosAsync.put(
                `https://api.spotify.com/v1/playlists/${newPlaylist.id}`,
                {
                    description: `Playlist with all ${artistData.name} songs, generated by pl4neta's extenstion allOfArtist`,
                },
            );
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
        for (let i = 0; i < playlists[0].length; i++) {
            await CosmosAsync.post(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                {
                    uris: playlists[0][i],
                },
            );
        }

        if (playlists.length > 1) {
            await CosmosAsync.put(
                `https://api.spotify.com/v1/playlists/${playlistId}`,
                {
                    name: `All Of ${artistData.name} 1/${playlists.length}`,
                },
            );

            for (let i = 1; i < playlists.length; i++) {
                const newPlaylist: any = await CosmosAsync.post(
                    `https://api.spotify.com/v1/users/${user.id}/playlists`,
                    {
                        name: `All Of ${artistData.name} ${i + 1}/${playlists.length}`,
                        description: `Playlist with all ${artistData.name} songs, generated by pl4neta's extenstion allOfArtist`,
                        public: false,
                        collaborative: false,
                    },
                );

                for (let r = 0; r < playlists[i].length; r++) {
                    await CosmosAsync.post(
                        `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
                        {
                            uris: playlists[i][r],
                        },
                    );
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

        while (array.length > 0) {
            const albums: any = await CosmosAsync.get(
                `https://api.spotify.com/v1/albums?ids=${array
                    .slice(0, 20)
                    .map((inner) => inner[1])
                    .join(",")}`,
            );
            array.splice(0, 20);

            for (const album of albums.albums) {
                let tracks: any = album.tracks;
                do {
                    for (let i = 0; i < tracks.items.length; i++) {
                        const track = tracks.items[i];

                        if (!CONFIG["addFeatures"] && track.artists[0].id !== artistData.id)
                            continue;

                        const track_artists: string[] = [];
                        for (let c = 0; c < track.artists.length; c++) {
                            track_artists.push(track.artists[c].id);
                        }

                        if (track_artists.includes(artistData.id)) {
                            if (CONFIG["removeDupes"]) {
                                const track_data: any = await CosmosAsync.get(
                                    `https://api.spotify.com/v1/tracks/${track.id}`,
                                );
                                const trackInfo: TrackHistoryItem = {
                                    name: track_data.name,
                                    uri: track_data.uri,
                                    trackCount: tracks.total,
                                    type: album.album_type,
                                    index: `${tracksAdd.length}_${albumTracksAdd.length}`,
                                    isrc: track_data.external_ids.isrc,
                                };

                                const playlist_tracks_index = await getIndexFrom2dArray(
                                    track_history,
                                    track_data.external_ids.isrc,
                                );

                                if (playlist_tracks_index >= 0) {
                                    if (
                                        CONFIG["trackPriority"] === "trackCount" &&
                                        album.album_type !== "compilation" &&
                                        (track_history[playlist_tracks_index].type ===
                                            "compilation" ||
                                            (track_history[playlist_tracks_index].type !==
                                                "compilation" &&
                                                tracks.total >
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
                                albumTracksAdd.push(track.uri);
                            }

                            if (albumTracksAdd.length === 100) {
                                tracksAdd.push(albumTracksAdd);
                                albumTracksAdd = [];
                            }
                        }
                    }

                    if (!tracks.next) break;
                    tracks = await CosmosAsync.get(tracks.next);
                } while (true);
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
            playlists.push(tracksAdd.slice(0, 100).flat());
            tracksAdd.splice(0, 100);
        }

        await addTracks(playlistId, playlists, artistData, user);
    }

    async function shouldDisplayContextMenu(
        uris: string[],
    ): Promise<boolean> {
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