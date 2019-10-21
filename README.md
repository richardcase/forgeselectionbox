# Forge selection box test

## Failure Scenario: Move Section Box

[This video](./videos/movesb.mkv) shows the steps to re-create the problem. But to summarize:

1. Upload [sample model](./model/SystemTypeSamples.rvt) to a bucket
2. Add a section box so that 1 of the objects is fully contained (and the other 2 objects are outside). **Make sure you move theg section box and not just expand it)
3. Click the sectionbox test button
4. Look at the developer tools console and you should see that only 1 object is "inside" but this reports the incorrect information
5. Close the section box (i.e. click the tool bar button) and check that box has been drawn where the section box was, it has been drawn in the wrong place


> If you just expand the sectionbox and not move it then it appears to work as expected. See [this video](./videos/expandnotmove.mkv).