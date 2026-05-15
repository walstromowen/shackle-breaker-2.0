export const STRUCTURES = {
    ABANDONED_VILLAGE: {
        width: 7,
        height: 7,
        terrain: [
            [2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2]
        ],
        objects: [
            // House anchored at the top-center (hitbox on row 2, columns 1-4).
            // Width is 4, so c: 1 leaves 1 tile open on the left and 2 on the right.
            { c: 1, r: 2, id: 'ABANDONED_HOUSE_1' },
            
            // ==========================================
            // CAMPFIRE STRESS TEST
            // ==========================================
            
            // Row 0 (Should render strictly behind the house's roof)
            { c: 0, r: 0, id: 'CAMPFIRE' }, { c: 1, r: 0, id: 'CAMPFIRE' }, { c: 2, r: 0, id: 'CAMPFIRE' }, 
            { c: 3, r: 0, id: 'CAMPFIRE' }, { c: 4, r: 0, id: 'CAMPFIRE' }, { c: 5, r: 0, id: 'CAMPFIRE' }, { c: 6, r: 0, id: 'CAMPFIRE' },
            
            // Row 1 (Should render strictly behind the house's midsection)
            { c: 0, r: 1, id: 'CAMPFIRE' }, { c: 1, r: 1, id: 'CAMPFIRE' }, { c: 2, r: 1, id: 'CAMPFIRE' }, 
            { c: 3, r: 1, id: 'CAMPFIRE' }, { c: 4, r: 1, id: 'CAMPFIRE' }, { c: 5, r: 1, id: 'CAMPFIRE' }, { c: 6, r: 1, id: 'CAMPFIRE' },
            
            // Row 2 (The house's bottom anchor/hitbox occupies c: 1, 2, 3, 4)
            { c: 0, r: 2, id: 'CAMPFIRE' }, /* house hitbox here */ { c: 5, r: 2, id: 'CAMPFIRE' }, { c: 6, r: 2, id: 'CAMPFIRE' },
            
            // Row 3 (Should render in front of the house)
            { c: 0, r: 3, id: 'CAMPFIRE' }, { c: 1, r: 3, id: 'CAMPFIRE' }, { c: 2, r: 3, id: 'CAMPFIRE' }, 
            { c: 3, r: 3, id: 'CAMPFIRE' }, { c: 4, r: 3, id: 'CAMPFIRE' }, { c: 5, r: 3, id: 'CAMPFIRE' }, { c: 6, r: 3, id: 'CAMPFIRE' },
            
            // Row 4
            { c: 0, r: 4, id: 'CAMPFIRE' }, { c: 1, r: 4, id: 'CAMPFIRE' }, { c: 2, r: 4, id: 'CAMPFIRE' }, 
            { c: 3, r: 4, id: 'CAMPFIRE' }, { c: 4, r: 4, id: 'CAMPFIRE' }, { c: 5, r: 4, id: 'CAMPFIRE' }, { c: 6, r: 4, id: 'CAMPFIRE' },
            
            // Row 5
            { c: 0, r: 5, id: 'CAMPFIRE' }, { c: 1, r: 5, id: 'CAMPFIRE' }, { c: 2, r: 5, id: 'CAMPFIRE' }, 
            { c: 3, r: 5, id: 'CAMPFIRE' }, { c: 4, r: 5, id: 'CAMPFIRE' }, { c: 5, r: 5, id: 'CAMPFIRE' }, { c: 6, r: 5, id: 'CAMPFIRE' },
            
            // Row 6
            { c: 0, r: 6, id: 'CAMPFIRE' }, { c: 1, r: 6, id: 'CAMPFIRE' }, { c: 2, r: 6, id: 'CAMPFIRE' }, 
            { c: 3, r: 6, id: 'CAMPFIRE' }, { c: 4, r: 6, id: 'CAMPFIRE' }, { c: 5, r: 6, id: 'CAMPFIRE' }, { c: 6, r: 6, id: 'CAMPFIRE' }
        ]
    }
};